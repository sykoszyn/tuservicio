import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { analizarFactura } from "@/lib/analisis";
import { nombreEmpresa, SERVICIOS, type Servicio } from "@/lib/datos";
import { crearClienteAdmin, crearClienteServidor } from "@/lib/supabase/server";

export const maxDuration = 120;

const MIME_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function POST(_req: Request, ctx: RouteContext<"/api/casos/[id]/analizar">) {
  const { id } = await ctx.params;

  // Con el cliente del usuario: RLS garantiza que el caso sea suyo.
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: caso } = await supabase.from("casos").select("*").eq("id", id).single();
  if (!caso) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  const admin = crearClienteAdmin();

  // Tomamos el caso solo si está pendiente (evita análisis duplicados por doble click).
  const { data: tomado } = await admin
    .from("casos")
    .update({ estado: "analizando", error_analisis: null })
    .eq("id", id)
    .eq("estado", "recibido")
    .select("id")
    .maybeSingle();
  if (!tomado) return NextResponse.json({ ok: true, estado: caso.estado });

  try {
    const { data: blob, error } = await admin.storage.from("facturas").download(caso.archivo_path);
    if (error || !blob) throw new Error("No pudimos leer el archivo subido.");

    const ext = caso.archivo_path.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_POR_EXTENSION[ext];
    if (!mime) throw new Error("Formato de archivo no soportado.");

    const analisis = await analizarFactura(
      { datos: Buffer.from(await blob.arrayBuffer()), mime },
      {
        empresa: nombreEmpresa(caso.empresa),
        servicio: SERVICIOS[caso.servicio as Servicio],
        numero_cliente: caso.numero_cliente,
        titular: caso.titular,
      },
    );

    await admin
      .from("casos")
      .update({ estado: "analizado", analisis, monto_actual: analisis.monto_total })
      .eq("id", id);
    await admin.from("eventos_caso").insert({
      caso_id: id,
      estado: "analizado",
      mensaje: analisis.legible
        ? "Leímos tu factura y armamos una estrategia."
        : "No pudimos leer bien la factura. Probá subir una foto más nítida o el PDF.",
    });

    return NextResponse.json({ ok: true, estado: "analizado" });
  } catch (e) {
    const mensaje =
      e instanceof Anthropic.RateLimitError
        ? "Hay mucha demanda en este momento. Reintentá en unos minutos."
        : e instanceof Anthropic.APIError
          ? "El servicio de análisis no respondió. Reintentá en unos minutos."
          : e instanceof Error
            ? e.message
            : "Error desconocido";
    console.error("Error analizando caso", id, e);
    // Vuelve a 'recibido' para poder reintentar.
    await admin.from("casos").update({ estado: "recibido", error_analisis: mensaje }).eq("id", id);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
