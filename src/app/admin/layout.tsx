import Link from "next/link";
import { requerirAdmin } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requerirAdmin();
  return (
    <div className="space-y-5">
      <nav className="flex gap-4 border-b border-slate-200 pb-2 text-sm font-medium">
        <Link href="/admin" className="hover:text-emerald-700">Casos</Link>
        <Link href="/admin/configuracion" className="hover:text-emerald-700">Configuración</Link>
      </nav>
      {children}
    </div>
  );
}
