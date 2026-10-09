import { ES_BETA, PLAZO_RESPUESTA } from "@/lib/datos";

/** Aviso de beta para las pantallas donde la gente pide ayuda. */
export default function AvisoBeta() {
  if (!ES_BETA) return null;
  return (
    <div className="flex gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
      <span className="text-lg leading-none">🧪</span>
      <p>
        <strong>Estamos en versión beta.</strong> Somos un equipo chico y cada factura la revisa una persona. Normalmente
        respondemos en {PLAZO_RESPUESTA}, pero si llegan muchas solicitudes puede demorar un poco más. ¡Gracias por la
        paciencia!
      </p>
    </div>
  );
}
