export const EMPRESAS = {
  telecentro: { nombre: "Telecentro", web: "https://www.telecentro.com.ar", servicios: ["internet", "tv", "telefonia_fija", "combo"] },
  personal: { nombre: "Personal", web: "https://www.personal.com.ar", servicios: ["celular", "internet", "combo"] },
  flow: { nombre: "Flow", web: "https://www.flow.com.ar", servicios: ["tv", "internet", "combo"] },
  movistar: { nombre: "Movistar", web: "https://www.movistar.com.ar", servicios: ["celular", "internet", "telefonia_fija", "combo"] },
  claro: { nombre: "Claro", web: "https://www.claro.com.ar", servicios: ["celular", "internet", "tv", "combo"] },
  otra: { nombre: "Otra empresa", web: null, servicios: ["internet", "tv", "celular", "telefonia_fija", "combo"] },
} as const;

export type Empresa = keyof typeof EMPRESAS;
export type Servicio = "internet" | "tv" | "celular" | "telefonia_fija" | "combo";

export const SERVICIOS: Record<Servicio, string> = {
  internet: "Internet",
  tv: "TV / Cable",
  celular: "Celular",
  telefonia_fija: "Teléfono fijo",
  combo: "Combo (varios servicios)",
};

export type Estado =
  | "recibido"
  | "analizando"
  | "analizado"
  | "en_negociacion"
  | "ahorro_conseguido"
  | "sin_ahorro"
  | "cancelado";

export const ESTADOS: Record<Estado, { texto: string; color: string }> = {
  recibido: { texto: "Recibida", color: "bg-slate-100 text-slate-700" },
  analizando: { texto: "Leyendo factura…", color: "bg-sky-100 text-sky-800" },
  analizado: { texto: "Analizada", color: "bg-indigo-100 text-indigo-800" },
  en_negociacion: { texto: "Negociando", color: "bg-amber-100 text-amber-800" },
  ahorro_conseguido: { texto: "¡Bajamos tu factura!", color: "bg-emerald-100 text-emerald-800" },
  sin_ahorro: { texto: "Sin rebaja por ahora", color: "bg-rose-100 text-rose-800" },
  cancelado: { texto: "Cancelado", color: "bg-slate-100 text-slate-500" },
};

export const pesos = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export const nombreEmpresa = (e: string) => EMPRESAS[e as Empresa]?.nombre ?? e;
