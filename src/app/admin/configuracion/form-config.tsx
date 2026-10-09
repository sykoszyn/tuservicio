"use client";

import { useActionState } from "react";
import type { Config } from "@/lib/config";
import { guardarConfiguracion, probarEmail, type EstadoForm } from "../acciones";

function Aviso({ estado }: { estado: EstadoForm }) {
  if (estado.error) return <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{estado.error}</p>;
  if (estado.ok) return <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{estado.ok}</p>;
  return null;
}

export default function FormConfig({ config, resendOk }: { config: Config; resendOk: boolean }) {
  const [guardado, guardar, guardando] = useActionState(guardarConfiguracion, {});
  const [prueba, probar, probando] = useActionState(probarEmail, {});

  return (
    <div className="space-y-5">
      <form action={guardar} className="space-y-5">
        <section className="tarjeta space-y-3">
          <h2 className="font-semibold">📬 Avisos por email</h2>
          <p className="text-sm text-slate-500">Te llega un email cada vez que alguien sube una factura o declara un aporte.</p>
          {!resendOk && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Falta la variable <code>RESEND_API_KEY</code> en Vercel. Sin ella no se mandan emails (ver README).
            </p>
          )}
          <div>
            <label className="label" htmlFor="email_avisos">Email donde querés recibir los avisos</label>
            <input id="email_avisos" name="email_avisos" type="email" className="input" defaultValue={config.email_avisos ?? ""} />
          </div>
        </section>

        <section className="tarjeta space-y-3">
          <h2 className="font-semibold">💚 Datos para aportes voluntarios</h2>
          <p className="text-sm text-slate-500">
            Solo se muestran a quien consiguió una rebaja, siempre como opcionales. Si dejás todo vacío, no se muestra nada.
          </p>
          <div>
            <label className="label" htmlFor="mp_alias">Alias</label>
            <input id="mp_alias" name="mp_alias" className="input" placeholder="tuservicio.ayuda" defaultValue={config.mp_alias ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="mp_cvu">CVU <span className="font-normal text-slate-400">(opcional)</span></label>
            <input id="mp_cvu" name="mp_cvu" className="input" inputMode="numeric" defaultValue={config.mp_cvu ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="mp_titular">Titular de la cuenta <span className="font-normal text-slate-400">(opcional, da confianza)</span></label>
            <input id="mp_titular" name="mp_titular" className="input" defaultValue={config.mp_titular ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="mp_link">Link de pago de Mercado Pago <span className="font-normal text-slate-400">(opcional)</span></label>
            <input id="mp_link" name="mp_link" className="input" placeholder="https://link.mercadopago.com.ar/..." defaultValue={config.mp_link ?? ""} />
          </div>
        </section>

        <Aviso estado={guardado} />
        <button className="btn-primario w-full" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
      </form>

      <form action={probar} className="tarjeta space-y-3">
        <p className="text-sm text-slate-600">Después de guardar, mandate un email de prueba:</p>
        <Aviso estado={prueba} />
        <button className="btn-secundario w-full" disabled={probando}>{probando ? "Enviando…" : "Enviar email de prueba"}</button>
      </form>
    </div>
  );
}
