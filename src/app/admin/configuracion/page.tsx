import { obtenerConfig } from "@/lib/config";
import FormConfig from "./form-config";

export const metadata = { title: "Configuración — TuServicio" };

export default async function Configuracion() {
  const config = await obtenerConfig();
  return (
    <div className="mx-auto max-w-xl space-y-2">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <FormConfig config={config} resendOk={!!process.env.RESEND_API_KEY} />
    </div>
  );
}
