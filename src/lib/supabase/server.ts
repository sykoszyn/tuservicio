import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

export async function crearClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: el proxy ya refresca la sesión.
          }
        },
      },
    },
  );
}

/** Cliente con service role: saltea RLS. Usar solo en el servidor y después de validar permisos. */
export function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type Usuario = {
  id: string;
  email: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
};

/**
 * Usuario de la sesión actual, o null. Verifica el token (JWT) sin ir al servidor de Supabase
 * cuando el proyecto usa claves asimétricas, y se calcula una sola vez por request.
 */
export const obtenerUsuario = cache(async (): Promise<Usuario | null> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  return {
    id: c.sub,
    email: (c.email as string | undefined) ?? null,
    app_metadata: (c.app_metadata as Record<string, unknown>) ?? {},
    user_metadata: (c.user_metadata as Record<string, unknown>) ?? {},
  };
});

/** Perfil de la sesión actual (una consulta por request). */
export const obtenerPerfil = cache(async (id: string) => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("perfiles").select("nombre, dni, telefono, es_admin").eq("id", id).maybeSingle();
  return data;
});

/** Devuelve el usuario logueado o redirige a /login. */
export async function requerirUsuario() {
  const [supabase, user] = await Promise.all([crearClienteServidor(), obtenerUsuario()]);
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requerirAdmin() {
  const { supabase, user } = await requerirUsuario();
  const perfil = await obtenerPerfil(user.id);
  if (!perfil?.es_admin) redirect("/panel");
  return { supabase, user };
}
