import { Suspense } from "react";
import FormLogin from "./form-login";

export const metadata = { title: "Ingresar — TuServicio" };

export default function Login() {
  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="mb-1 text-2xl font-bold">Ingresá a TuServicio</h1>
      <p className="mb-6 text-sm text-slate-600">Con tu cuenta de Google, sin contraseñas. Si es tu primera vez, se crea sola.</p>
      <Suspense>
        <FormLogin />
      </Suspense>
    </div>
  );
}
