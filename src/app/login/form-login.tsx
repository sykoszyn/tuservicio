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

  async function conGoogle() {
    setCargando(true);
    setError("");
    const { error } = await crearClienteNavegador().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?volver=${encodeURIComponent(volver)}` },
    });
    // Si sale bien, el navegador ya se fue a Google.
    if (error) {
      setCargando(false);
      setError("No se pudo ingresar con Google. Probá de nuevo o usá tu email.");
    }
  }

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
      <button type="button" onClick={conGoogle} disabled={cargando} className="btn-secundario mb-4 w-full">
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continuar con Google
      </button>
      <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />o con tu email<span className="h-px flex-1 bg-slate-200" />
      </div>
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
