import { requerirUsuario } from "@/lib/supabase/server";
import FormNuevo from "./form-nuevo";

export const metadata = { title: "Subir factura — TuServicio" };

export default async function Nuevo() {
  const { supabase, user } = await requerirUsuario();
  const { data: perfil } = await supabase.from("perfiles").select("nombre, dni, telefono").eq("id", user.id).single();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Subí tu factura</h1>
      <p className="mb-6 text-slate-600">Tarda 2 minutos. Gratis, siempre.</p>
      <FormNuevo userId={user.id} perfil={perfil ?? { nombre: null, dni: null, telefono: null }} />
    </div>
  );
}
