"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { iaHabilitada } from "@/lib/analisis";
import { EMPRESAS, nombreEmpresa, pesos, SERVICIOS } from "@/lib/datos";
import { avisarAdmin, urlBase } from "@/lib/email";
import { crearClienteAdmin, requerirUsuario } from "@/lib/supabase/server";

const NuevoCaso = z.object({
  empresa: z.enum(Object.keys(EMPRESAS) as [keyof typeof EMPRESAS, ...(keyof typeof EMPRESAS)[]]),
  servicio: z.enum(["internet", "tv", "celular", "telefonia_fija", "combo"]),
  numero_cliente: z.string().trim().min(1, "Falta el número de cliente").max(40),
  dni_titular: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{7,8}$/, "El DNI tiene que tener 7 u 8 números")),
  titular: z.string().trim().min(2, "Falta el nombre del titular").max(120),
  telefono_contacto: z.string().trim().max(30).optional(),
  archivo_path: z.string().min(1),
  autoriza_gestion: z.boolean().refine((v) => v, "Necesitamos tu autorización para hablar con la empresa"),
});

export type ResultadoCrear = { ok: true; id: string } | { ok: false; error: string };

export async function crearCaso(datos: z.input<typeof NuevoCaso>): Promise<ResultadoCrear> {
  const { supabase, user } = await requerirUsuario();
  const parseado = NuevoCaso.safeParse(datos);
  if (!parseado.success) return { ok: false, error: parseado.error.issues[0].message };
  const caso = parseado.data;
  if (!caso.archivo_path.startsWith(`${user.id}/`)) return { ok: false, error: "Archivo inválido" };

  const { data, error } = await supabase
    .from("casos")
    .insert({ ...caso, user_id: user.id })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Error guardando caso:", error);
    // Borramos el archivo subido para no dejarlo huérfano.
    await supabase.storage.from("facturas").remove([caso.archivo_path]);
    return {
      ok: false,
      error: `No pudimos guardar el caso. Probá de nuevo.${error ? ` (Detalle: ${error.code} ${error.message})` : ""}`,
    };
  }

  const admin = crearClienteAdmin();
  await admin.from("eventos_caso").insert({ caso_id: data.id, estado: "recibido", mensaje: "Recibimos tu factura." });
  if (!iaHabilitada()) {
    // Sin análisis automático: pasa directo a la cola de gestión del equipo.
    await admin.from("casos").update({ estado: "en_negociacion" }).eq("id", data.id);
    await admin.from("eventos_caso").insert({
      caso_id: data.id,
      estado: "en_negociacion",
      mensaje: "Vamos a hablar con la empresa por vos. Te avisamos acá cuando tengamos novedades.",
    });
  }
  // Guardamos DNI/teléfono en el perfil para autocompletar la próxima vez.
  await supabase
    .from("perfiles")
    .update({ dni: caso.dni_titular, telefono: caso.telefono_contacto || null })
    .eq("id", user.id);

  const link = `${await urlBase()}/admin/caso/${data.id}`;
  after(() =>
    avisarAdmin(
      `Nueva factura: ${nombreEmpresa(caso.empresa)} · ${caso.titular}`,
      [
        ["Empresa", nombreEmpresa(caso.empresa)],
        ["Servicio", SERVICIOS[caso.servicio]],
        ["Titular", caso.titular],
        ["N° cliente", caso.numero_cliente],
        ["WhatsApp", caso.telefono_contacto || "—"],
      ],
      link,
    ),
  );

  revalidatePath("/panel");
  return { ok: true, id: data.id };
}

const ABIERTOS = ["recibido", "analizado", "en_negociacion"];

/** Lee el caso con los permisos del usuario (RLS: el dueño o un admin). */
async function leerCaso(id: string) {
  const { supabase } = await requerirUsuario();
  const { data } = await supabase.from("casos").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Borra el caso y su factura (para cuando la persona se equivocó o ya no lo necesita). */
export async function cancelarCaso(id: string): Promise<{ error?: string }> {
  const caso = await leerCaso(id);
  if (!caso) return { error: "No encontramos el caso." };
  if (!ABIERTOS.includes(caso.estado)) return { error: "Este caso ya está cerrado y no se puede cancelar." };

  const admin = crearClienteAdmin();
  const { error } = await admin.from("casos").delete().eq("id", id);
  if (error) {
    console.error("Error cancelando caso:", error);
    return { error: "No se pudo cancelar. Probá de nuevo en un rato." };
  }
  await admin.storage.from("facturas").remove([caso.archivo_path]);

  after(() =>
    avisarAdmin(
      `Cancelado por el usuario: ${nombreEmpresa(caso.empresa)} · ${caso.titular}`,
      [
        ["Empresa", nombreEmpresa(caso.empresa)],
        ["Titular", caso.titular],
        ["N° cliente", caso.numero_cliente],
      ],
      "",
    ),
  );
  revalidatePath("/panel");
  revalidatePath("/admin");
  return {};
}

const EdicionCaso = NuevoCaso.pick({
  empresa: true,
  servicio: true,
  numero_cliente: true,
  dni_titular: true,
  titular: true,
  telefono_contacto: true,
});

export async function editarCaso(id: string, datos: z.input<typeof EdicionCaso>): Promise<{ error?: string }> {
  const caso = await leerCaso(id);
  if (!caso) return { error: "No encontramos el caso." };
  if (!ABIERTOS.includes(caso.estado)) return { error: "Este caso ya está cerrado." };
  const r = EdicionCaso.safeParse(datos);
  if (!r.success) return { error: r.error.issues[0].message };

  const admin = crearClienteAdmin();
  const { error } = await admin
    .from("casos")
    .update({ ...r.data, telefono_contacto: r.data.telefono_contacto || null })
    .eq("id", id);
  if (error) {
    console.error("Error editando caso:", error);
    return { error: "No se pudieron guardar los cambios. Probá de nuevo." };
  }
  await admin.from("eventos_caso").insert({ caso_id: id, estado: caso.estado, mensaje: "Corregiste los datos del caso." });
  revalidatePath(`/panel/caso/${id}`);
  revalidatePath(`/admin/caso/${id}`);
  return {};
}

export async function pedirGestion(id: string) {
  const caso = await leerCaso(id);
  if (!caso || caso.estado !== "analizado") return;

  const admin = crearClienteAdmin();
  await admin.from("casos").update({ estado: "en_negociacion", autoriza_gestion: true }).eq("id", id);
  await admin.from("eventos_caso").insert({
    caso_id: id,
    estado: "en_negociacion",
    mensaje: "Nos autorizaste a gestionar. Vamos a contactar a la empresa por vos.",
  });
  revalidatePath(`/panel/caso/${id}`);
}

/** Resultado cuando la persona negoció sola con el guion. */
export async function informarResultado(id: string, montoNuevo: number | null) {
  const caso = await leerCaso(id);
  if (!caso || !["analizado", "en_negociacion"].includes(caso.estado)) return;

  const bajo = montoNuevo != null && montoNuevo > 0 && (caso.monto_actual == null || montoNuevo < caso.monto_actual);
  const admin = crearClienteAdmin();
  await admin
    .from("casos")
    .update({ estado: bajo ? "ahorro_conseguido" : "sin_ahorro", monto_nuevo: bajo ? montoNuevo : null })
    .eq("id", id);
  await admin.from("eventos_caso").insert({
    caso_id: id,
    estado: bajo ? "ahorro_conseguido" : "sin_ahorro",
    mensaje: bajo ? "Nos contaste que conseguiste una rebaja. ¡Bien ahí!" : "Nos contaste que no hubo rebaja esta vez.",
  });
  revalidatePath(`/panel/caso/${id}`);
}

export async function declararAporte(id: string, monto: number) {
  const { supabase, user } = await requerirUsuario();
  if (!(monto > 0)) return;
  const { error } = await supabase.from("aportes").insert({ caso_id: id, user_id: user.id, monto });
  if (!error) {
    const link = `${await urlBase()}/admin/caso/${id}`;
    after(() => avisarAdmin(`Aporte voluntario declarado: ${pesos(monto)}`, [["Monto", pesos(monto)]], link));
  }
  revalidatePath(`/panel/caso/${id}`);
}
