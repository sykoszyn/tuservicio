import { Suspense } from "react";
import FormLogin from "./form-login";

export const metadata = { title: "Ingresar — TuServicio" };

export default function Login() {
  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="mb-1 text-2xl font-bold">Ingresá o creá tu cuenta</h1>
      <p className="mb-6 text-sm text-slate-600">Para seguir el estado de tus facturas.</p>
      <Suspense>
        <FormLogin />
      </Suspense>
    </div>
  );
}
