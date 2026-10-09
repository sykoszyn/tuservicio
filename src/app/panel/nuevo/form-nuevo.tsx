"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EMPRESAS, SERVICIOS, type Empresa, type Servicio } from "@/lib/datos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { crearCaso } from "../acciones";

type Perfil = { nombre: string | null; dni: string | null; telefono: string | null };

const MAX_MB = 10;
const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Achica fotos del celular (suelen pesar 5-10 MB) a JPEG de ~2000px: sube más rápido y se lee igual. */
async function comprimirImagen(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith("image/") || archivo.size < 1_500_000) return archivo;
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((ok) => canvas.toBlob((b) => ok(b ?? archivo), "image/jpeg", 0.85));
}

export default function FormNuevo({ userId, perfil }: { userId: string; perfil: Perfil }) {
  const router = useRouter();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [paso, setPaso] = useState<"" | "subiendo" | "guardando">("");
  const [error, setError] = useState("");

  function elegirArchivo(f: File | undefined) {
    setError("");
    if (!f) return setArchivo(null);
    if (!TIPOS.includes(f.type)) return setError("Subí un PDF o una foto (JPG, PNG o WEBP).");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`El archivo pesa más de ${MAX_MB} MB.`);
    setArchivo(f);
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!empresa || !servicio) return setError("Elegí la empresa y el servicio.");
    if (!archivo) return setError("Falta la factura.");
    const f = new FormData(e.currentTarget);
    setError("");

    setPaso("subiendo");
    const contenido = await comprimirImagen(archivo);
    const ext = contenido.type === "application/pdf" ? "pdf" : contenido.type.split("/")[1].replace("jpeg", "jpg");
    const ruta = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: errSubida } = await crearClienteNavegador()
      .storage.from("facturas")
      .upload(ruta, contenido, { contentType: contenido.type });
    if (errSubida) {
      setPaso("");
      return setError("No se pudo subir el archivo. Revisá tu conexión y probá de nuevo.");
    }

    setPaso("guardando");
    const res = await crearCaso({
      empresa,
      servicio,
      numero_cliente: String(f.get("numero_cliente")),
      dni_titular: String(f.get("dni_titular")),
      titular: String(f.get("titular")),
      telefono_contacto: String(f.get("telefono_contacto") ?? ""),
      archivo_path: ruta,
      autoriza_gestion: f.get("autoriza_gestion") === "on",
    });
    if (!res.ok) {
      setPaso("");
      return setError(res.error);
    }
    router.push(`/panel/caso/${res.id}`);
  }

  const serviciosDisponibles = empresa ? EMPRESAS[empresa].servicios : [];

  return (
    <form onSubmit={enviar} className="space-y-6">
      <section className="tarjeta space-y-3">
        <h2 className="font-semibold">1. ¿De qué empresa es?</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(EMPRESAS) as Empresa[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setEmpresa(k);
                if (servicio && !(EMPRESAS[k].servicios as readonly string[]).includes(servicio)) setServicio(null);
              }}
              className={`rounded-xl border px-3 py-3 font-medium transition ${
                empresa === k ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200" : "border-slate-300 bg-white hover:bg-slate-50"
              }`}
            >
              {EMPRESAS[k].nombre}
            </button>
          ))}
        </div>
        {empresa && (
          <>
            <h3 className="pt-2 text-sm font-medium text-slate-700">¿Qué servicio?</h3>
            <div className="flex flex-wrap gap-2">
              {serviciosDisponibles.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setServicio(s)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${
                    servicio === s ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  {SERVICIOS[s]}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="tarjeta space-y-3">
        <h2 className="font-semibold">2. Datos del titular</h2>
        <p className="text-sm text-slate-500">Están en la factura. Con esto la empresa identifica la cuenta más rápido.</p>
        <div>
          <label className="label" htmlFor="numero_cliente">Número de cliente</label>
          <input id="numero_cliente" name="numero_cliente" className="input" inputMode="text" maxLength={40} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="dni_titular">DNI del titular</label>
            <input
              id="dni_titular"
              name="dni_titular"
              className="input"
              inputMode="numeric"
              pattern="[0-9.\s]{7,11}"
              placeholder="30123456"
              defaultValue={perfil.dni ?? ""}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="titular">Nombre del titular</label>
            <input id="titular" name="titular" className="input" autoComplete="name" defaultValue={perfil.nombre ?? ""} required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="telefono_contacto">
            Tu WhatsApp <span className="font-normal text-slate-400">(opcional, para avisarte)</span>
          </label>
          <input
            id="telefono_contacto"
            name="telefono_contacto"
            className="input"
            inputMode="tel"
            autoComplete="tel"
            placeholder="11 2345 6789"
            defaultValue={perfil.telefono ?? ""}
          />
        </div>
      </section>

      <section className="tarjeta space-y-3">
        <h2 className="font-semibold">3. Tu última factura</h2>
        <label
          htmlFor="archivo"
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
            archivo ? "border-emerald-400 bg-emerald-50" : "border-slate-300 hover:border-emerald-400"
          }`}
        >
          <span className="text-3xl">{archivo ? "✅" : "📄"}</span>
          <span className="mt-2 font-medium">{archivo ? archivo.name : "Sacá una foto o elegí el PDF"}</span>
          <span className="text-xs text-slate-500">PDF, JPG o PNG · hasta {MAX_MB} MB</span>
        </label>
        <input
          id="archivo"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => elegirArchivo(e.target.files?.[0])}
        />
        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
          <input type="checkbox" name="autoriza_gestion" className="mt-1 h-4 w-4 accent-emerald-600" />
          <span>
            Autorizo a TuServicio a contactar a la empresa en mi nombre para pedir una rebaja. Nunca vamos a dar de baja
            ni cambiar tu plan sin tu confirmación.
          </span>
        </label>
      </section>

      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <button className="btn-primario w-full text-lg" disabled={!!paso}>
        {paso === "subiendo" ? "Subiendo factura…" : paso === "guardando" ? "Guardando…" : "Enviar factura"}
      </button>
    </form>
  );
}
