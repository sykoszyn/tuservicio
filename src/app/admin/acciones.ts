"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ESTADOS, type Estado } from "@/lib/datos";
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
