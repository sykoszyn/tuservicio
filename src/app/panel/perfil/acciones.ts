"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/supabase/server";

const Perfil = z.object({
  nombre: z.string().trim().max(120).transform((s) => s || null),
  dni: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^\d{7,8}$/, "El DNI tiene que tener 7 u 8 números")]))
    .transform((s) => s || null),
  telefono: z.string().trim().max(30).transform((s) => s || null),
});

export type EstadoPerfil = { ok?: string; error?: string };

export async function guardarPerfil(_prev: EstadoPerfil, form: FormData): Promise<EstadoPerfil> {
  const { supabase, user } = await requerirUsuario();
  const r = Perfil.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const { error } = await supabase.from("perfiles").update(r.data).eq("id", user.id);
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };
  revalidatePath("/", "layout");
  return { ok: "¡Listo! Guardamos tus datos." };
}
