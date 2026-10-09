import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
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

  return (
    <html lang="es-AR">
      <body className="min-h-dvh">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              Tu<span className="text-emerald-600">Servicio</span>
            </Link>
            {data.user ? (
              <div className="flex items-center gap-3 text-sm">
                <Link href="/panel" className="font-medium hover:text-emerald-700">
                  Mis facturas
                </Link>
                <form action="/auth/salir" method="post">
                  <button className="text-slate-500 hover:text-slate-800">Salir</button>
                </form>
              </div>
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
