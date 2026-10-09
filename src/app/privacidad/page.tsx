import { obtenerConfig } from "@/lib/config";

export const metadata = { title: "Política de privacidad — TuServicio" };

export default async function Privacidad() {
  const { email_avisos } = await obtenerConfig();
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-slate-700 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900">
      <h1 className="text-2xl font-bold text-slate-900">Política de privacidad</h1>
      <p>TuServicio ayuda a bajar el costo de facturas de servicios. Esta política explica qué datos usamos y para qué, de acuerdo con la Ley 25.326 de Protección de Datos Personales.</p>
      <h2>Qué datos guardamos</h2>
      <ul className="list-disc pl-5">
        <li>Tu email y nombre (o los de tu cuenta de Google, si ingresás con Google).</li>
        <li>Los datos que cargás: empresa, número de cliente, DNI y nombre del titular, y teléfono si lo dejás.</li>
        <li>La foto o PDF de tu factura.</li>
      </ul>
      <h2>Para qué los usamos</h2>
      <p>Solo para gestionar la rebaja de tu factura: identificarte ante la empresa prestadora cuando nos autorizás, y avisarte cómo va tu caso. No vendemos ni compartimos tus datos con terceros con fines comerciales.</p>
      <h2>Dónde se guardan</h2>
      <p>En servidores de Supabase, con acceso restringido: cada persona ve solo sus casos y las facturas se guardan en un almacenamiento privado.</p>
      <h2>Tus derechos</h2>
      <p>Podés pedir ver, corregir o borrar tus datos en cualquier momento{email_avisos ? <> escribiendo a <a className="text-emerald-700 underline" href={`mailto:${email_avisos}`}>{email_avisos}</a></> : null}. La Agencia de Acceso a la Información Pública es el órgano de control de la Ley 25.326.</p>
    </article>
  );
}
