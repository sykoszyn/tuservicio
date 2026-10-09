"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarCasoAdmin, cancelarCasoAdmin } from "../../acciones";

export default function CancelarAdmin({ id, cancelado }: { id: string; cancelado: boolean }) {
  const router = useRouter();
  const [modo, setModo] = useState<"" | "cancelar" | "borrar">("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [pendiente, start] = useTransition();

  const cerrar = () => {
    if (pendiente) return;
    setModo("");
    setError("");
  };

  return (
    <section className="tarjeta">
      <p className="font-semibold">Cancelar o borrar</p>
      <p className="mb-4 text-sm text-slate-500">
        <b>Cancelar</b>: el usuario ve el caso como cancelado y el motivo. <b>Borrar</b>: se eliminan el caso y la factura
        para siempre (pruebas, duplicados, spam).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="btn border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 disabled:opacity-50"
          disabled={cancelado}
          onClick={() => setModo("cancelar")}
        >
          {cancelado ? "Ya está cancelado" : "⛔ Cancelar caso"}
        </button>
        <button
          type="button"
          className="btn border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
          onClick={() => setModo("borrar")}
        >
          🗑️ Borrar definitivamente
        </button>
      </div>

      {modo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={cerrar}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div
              className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl ${modo === "borrar" ? "bg-rose-100" : "bg-amber-100"}`}
            >
              {modo === "borrar" ? "🗑️" : "⛔"}
            </div>
            <h3 className="text-center text-lg font-bold">
              {modo === "borrar" ? "¿Borrar el caso para siempre?" : "¿Cancelar este caso?"}
            </h3>
            {modo === "borrar" ? (
              <p className="mt-1 text-center text-sm text-slate-600">
                Se eliminan el caso, su historial y la foto de la factura. No se puede deshacer.
              </p>
            ) : (
              <div className="mt-3">
                <label className="label" htmlFor="motivo">Motivo para el usuario (opcional)</label>
                <textarea
                  id="motivo"
                  rows={3}
                  className="input"
                  placeholder="Ej: la factura no se lee bien, subila de nuevo por favor."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
            )}
            {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                disabled={pendiente}
                className={`btn text-white ${modo === "borrar" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"}`}
                onClick={() =>
                  start(async () => {
                    const r = modo === "borrar" ? await borrarCasoAdmin(id) : await cancelarCasoAdmin(id, motivo);
                    if (r.error) return setError(r.error);
                    if (modo === "borrar") router.push("/admin");
                    else setModo("");
                    router.refresh();
                  })
                }
              >
                {pendiente ? "Un momento…" : modo === "borrar" ? "Sí, borrar" : "Sí, cancelar"}
              </button>
              <button type="button" className="btn-secundario" onClick={cerrar} disabled={pendiente}>
                No, volver
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
