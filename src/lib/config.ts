import { crearClienteAdmin } from "@/lib/supabase/server";

export type Config = {
  email_avisos: string | null;
  mp_alias: string | null;
  mp_cvu: string | null;
  mp_titular: string | null;
  mp_link: string | null;
};

/** Lee la configuración del admin (con service role: los usuarios comunes no tienen acceso directo). */
export async function obtenerConfig(): Promise<Config> {
  const { data } = await crearClienteAdmin()
    .from("configuracion")
    .select("email_avisos, mp_alias, mp_cvu, mp_titular, mp_link")
    .eq("id", 1)
    .maybeSingle();
  return {
    email_avisos: data?.email_avisos ?? null,
    mp_alias: data?.mp_alias || process.env.NEXT_PUBLIC_MP_ALIAS || null,
    mp_cvu: data?.mp_cvu ?? null,
    mp_titular: data?.mp_titular ?? null,
    mp_link: data?.mp_link || process.env.NEXT_PUBLIC_MP_LINK || null,
  };
}
