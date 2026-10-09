"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ESTADOS, type Estado } from "@/lib/datos";
import { obtenerConfig } from "@/lib/config";
import { enviarEmail } from "@/lib/email";
import { requerirAdmin } from "@/lib/supabase/server";

const monto = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(String(v).replace(/\./g, "").replace(",", "."))),
  z.number().positive().nullable(),
);

const Actualizacion = z.object({
  estado: z.enum(Object.keys(ESTADOS) as [Estado, ...Estado[]]),
  monto_actual: monto,
  monto_nuevo: monto,
  mensaje_operador: z.string().trim().max(2000).transform((s) => s || null),
  notas_internas: z.string().trim().max(5000).transform((s) => s || null),
  evento: z.string().trim().max(500),
});

export async function actualizarCaso(id: string, form: FormData) {
  const { supabase } = await requerirAdmin();
  const datos = Actualizacion.parse(Object.fromEntries(form));
  const { data: previo } = await supabase.from("casos").select("estado").eq("id", id).single();

  const { evento, ...cambios } = datos;
  await supabase.from("casos").update(cambios).eq("id", id);

  if (evento || previo?.estado !== datos.estado) {
    await supabase.from("eventos_caso").insert({
      caso_id: id,
      estado: datos.estado,
      mensaje: evento || `Estado: ${ESTADOS[datos.estado].texto}`,
    });
  }
  revalidatePath(`/admin/caso/${id}`);
  revalidatePath(`/panel/caso/${id}`);
  redirect(`/admin/caso/${id}?guardado=1`);
}

export async function confirmarAporte(aporteId: string, casoId: string) {
  const { supabase } = await requerirAdmin();
  await supabase.from("aportes").update({ confirmado: true }).eq("id", aporteId);
  revalidatePath(`/admin/caso/${casoId}`);
}

const Configuracion = z.object({
  email_avisos: z.union([z.literal(""), z.email("Email inválido")]).transform((s) => s || null),
  mp_alias: z.string().trim().max(60).transform((s) => s || null),
  mp_cvu: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .pipe(z.union([z.literal(""), z.string().length(22, "El CVU tiene 22 números")]))
    .transform((s) => s || null),
  mp_titular: z.string().trim().max(120).transform((s) => s || null),
  mp_link: z
    .union([z.literal(""), z.url({ protocol: /^https$/, error: "El link tiene que empezar con https://" })])
    .transform((s) => s || null),
});

export type EstadoForm = { ok?: string; error?: string };

export async function guardarConfiguracion(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await requerirAdmin();
  const r = Configuracion.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const { error } = await supabase.from("configuracion").update(r.data).eq("id", 1);
  if (error) return { error: "No se pudo guardar. ¿Ejecutaste la migración 0002_configuracion.sql?" };
  revalidatePath("/admin/configuracion");
  return { ok: "Guardado." };
}

export async function probarEmail(_prev: EstadoForm): Promise<EstadoForm> {
  await requerirAdmin();
  const { email_avisos } = await obtenerConfig();
  if (!email_avisos) return { error: "Primero guardá un email de avisos." };
  const error = await enviarEmail(
    email_avisos,
    "Prueba de avisos de TuServicio",
    "<p>¡Funciona! Vas a recibir un email como este cada vez que alguien suba una factura.</p>",
  );
  return error ? { error } : { ok: `Email de prueba enviado a ${email_avisos}. Revisá también spam.` };
}
