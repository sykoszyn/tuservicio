"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Modo = "ingresar" | "registrarse" | "link";

const MENSAJES_ERROR: Record<string, string> = {
  "Invalid login credentials": "Email o contraseña incorrectos.",
  "User already registered": "Ya existe una cuenta con ese email. Probá ingresar.",
  "Email not confirmed": "Confirmá tu email desde el link que te enviamos.",
};

export default function FormLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const volver = params.get("volver") ?? "/panel";
  const [modo, setModo] = useState<Modo>("ingresar");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(params.get("error") ? "El link venció o no es válido. Pedí otro." : "");
  const [aviso, setAviso] = useState("");

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password") ?? "");
    const nombre = String(f.get("nombre") ?? "").trim();
    const supabase = crearClienteNavegador();
    const redirect = `${window.location.origin}/auth/callback?volver=${encodeURIComponent(volver)}`;

    setCargando(true);
    setError("");
    setAviso("");
    const { data, error } =
      modo === "ingresar"
        ? await supabase.auth.signInWithPassword({ email, password })
        : modo === "registrarse"
          ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect, data: { nombre } } })
          : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    setCargando(false);

    if (error) return setError(MENSAJES_ERROR[error.message] ?? error.message);
    if (data.session) {
      router.replace(volver);
      router.refresh();
    } else {
      setAviso("Te mandamos un email. Abrí el link para continuar.");
    }
  }

  return (
    <div className="tarjeta">
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm">
        {(
          [
            ["ingresar", "Ingresar"],
            ["registrarse", "Crear cuenta"],
            ["link", "Sin contraseña"],
          ] as const
        ).map(([m, t]) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`rounded-lg py-2 font-medium ${modo === m ? "bg-white shadow-sm" : "text-slate-600"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} className="space-y-3">
        {modo === "registrarse" && (
          <div>
            <label className="label" htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" className="input" autoComplete="name" required />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required />
        </div>
        {modo !== "link" && (
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              minLength={6}
              autoComplete={modo === "ingresar" ? "current-password" : "new-password"}
              required
            />
          </div>
        )}
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {aviso && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}
        <button className="btn-primario w-full" disabled={cargando}>
          {cargando ? "Un momento…" : modo === "ingresar" ? "Ingresar" : modo === "registrarse" ? "Crear cuenta" : "Mandame el link"}
        </button>
      </form>
    </div>
  );
}
