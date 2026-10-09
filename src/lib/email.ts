import { headers } from "next/headers";
import { obtenerConfig } from "@/lib/config";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** URL pública del sitio, tomada del request actual. */
export async function urlBase() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Manda un email con Resend (https://resend.com). Devuelve un error legible o null si salió bien. */
export async function enviarEmail(para: string, asunto: string, html: string): Promise<string | null> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) return "Falta configurar RESEND_API_KEY en Vercel.";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_REMITENTE || "TuServicio <onboarding@resend.dev>",
      to: [para],
      subject: asunto,
      html,
    }),
  });
  if (r.ok) return null;
  const cuerpo = await r.json().catch(() => ({}));
  return `Resend respondió ${r.status}: ${cuerpo.message ?? "error desconocido"}`;
}

/** Aviso al admin. Nunca tira error: si falla, solo lo registra en los logs. */
export async function avisarAdmin(asunto: string, lineas: [string, string][], link: string) {
  try {
    const { email_avisos } = await obtenerConfig();
    if (!email_avisos) return;
    const filas = lineas
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`)
      .join("");
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#0f172a">
      <h2 style="margin:0 0 12px">${esc(asunto)}</h2>
      <table>${filas}</table>
      ${link ? `<p style="margin-top:20px"><a href="${esc(link)}" style="background:#059669;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600">Abrir en el panel</a></p>` : ""}
    </div>`;
    const error = await enviarEmail(email_avisos, asunto, html);
    if (error) console.error("Aviso por email:", error);
  } catch (e) {
    console.error("Aviso por email:", e);
  }
}
