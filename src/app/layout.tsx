import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import MenuUsuario from "@/components/menu-usuario";
import { ES_BETA } from "@/lib/datos";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "TuServicio — Bajá tu factura gratis",
  description:
    "Subí tu factura de internet, cable o celular y te ayudamos a pagar menos. Gratis: si querés y podés, aportás lo que quieras.",
};

export const viewport: Viewport = { themeColor: "#059669" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  const { data: perfil } = data.user
    ? await supabase.from("perfiles").select("nombre, es_admin").eq("id", data.user.id).maybeSingle()
    : { data: null };

  return (
    <html lang="es-AR">
      <body className="min-h-dvh">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span>
                Tu<span className="text-emerald-600">Servicio</span>
              </span>
              {ES_BETA && (
                <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-violet-700">
                  BETA
                </span>
              )}
            </Link>
            {data.user ? (
              <MenuUsuario
                email={data.user.email ?? ""}
                nombre={perfil?.nombre ?? null}
                esAdmin={!!perfil?.es_admin}
                foto={(data.user.user_metadata?.avatar_url as string | undefined) ?? null}
              />
            ) : (
              <Link href="/login" className="text-sm font-medium hover:text-emerald-700">
                Ingresar
              </Link>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 py-10 text-center text-xs text-slate-500">
          TuServicio no está asociado a ninguna de las empresas mencionadas. Tus datos se usan solo para gestionar tu
          factura (Ley 25.326).
          <span className="mt-2 flex justify-center gap-4">
            <Link href="/privacidad" className="underline">Privacidad</Link>
            <Link href="/terminos" className="underline">Condiciones</Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
