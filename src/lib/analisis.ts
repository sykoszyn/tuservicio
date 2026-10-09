import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const AnalisisSchema = z.object({
  legible: z.boolean().describe("false si la imagen/PDF no es una factura o no se puede leer"),
  empresa_detectada: z.string().nullable(),
  titular: z.string().nullable(),
  numero_cliente: z.string().nullable(),
  periodo: z.string().nullable().describe("Ej: 'Septiembre 2026'"),
  vencimiento: z.string().nullable(),
  monto_total: z.number().nullable().describe("Total a pagar del período, en pesos"),
  plan_actual: z.string().nullable(),
  conceptos: z.array(z.object({ descripcion: z.string(), monto: z.number().nullable() })),
  hallazgos: z.array(
    z.object({
      tipo: z.enum(["aumento", "promo_vencida", "cargo_extra", "servicio_no_usado", "equipo_alquilado", "otro"]),
      detalle: z.string(),
      impacto_mensual: z.number().nullable(),
    }),
  ),
  ahorro_estimado_mensual: z.number().nullable().describe("Estimación conservadora de cuánto se puede bajar por mes"),
  probabilidad: z.enum(["alta", "media", "baja"]),
  resumen: z.string().describe("2-3 oraciones, en castellano rioplatense, para el usuario"),
  guion: z.string().describe("Guion para llamar o chatear con el área de retención/bajas"),
  pasos: z.array(z.string()).describe("Pasos concretos y cortos para que la persona lo haga sola si quiere"),
});

export type Analisis = z.infer<typeof AnalisisSchema>;

/** Sin ANTHROPIC_API_KEY no se analiza con IA: las facturas pasan directo a gestión manual. */
export const iaHabilitada = () => !!process.env.ANTHROPIC_API_KEY;

const SISTEMA = `Sos un analista de facturas de servicios (internet, TV, celular, telefonía) en Argentina. Ayudás a personas con poca plata a pagar menos, gratis.

Tu tarea con la factura adjunta:
1. Extraé los datos tal como figuran. Si un dato no está, usá null. No inventes montos.
2. Buscá motivos concretos para pedir una rebaja: promociones vencidas, aumentos recientes, cargos extra (alquiler de deco/módem, seguros, packs, servicios premium), servicios que probablemente no se usan, punitorios.
3. Estimá un ahorro mensual conservador y realista. Si no ves margen, decilo y poné probabilidad "baja".
4. Escribí un guion corto y amable para hablar con el área de retención o bajas de la empresa: presentarse con titular, DNI y número de cliente, mencionar antigüedad, el monto actual, que se está evaluando dar de baja o cambiarse a la competencia, y pedir una promoción de retención o un plan más barato. Pedir siempre número de gestión/reclamo y que la nueva tarifa quede por escrito.
5. No cites precios de la competencia ni números de teléfono específicos: pueden estar desactualizados. Si corresponde, recordá que el botón de baja en la web de la empresa y Defensa del Consumidor son opciones.

Escribí en castellano rioplatense (vos), claro y sin tecnicismos.`;

let cliente: Anthropic | null = null;
const anthropic = () => (cliente ??= new Anthropic());

type Archivo = { datos: Buffer; mime: string };

export async function analizarFactura(
  archivo: Archivo,
  contexto: { empresa: string; servicio: string; numero_cliente: string; titular: string },
): Promise<Analisis> {
  const base64 = archivo.datos.toString("base64");
  const adjunto: Anthropic.Beta.BetaContentBlockParam =
    archivo.mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: archivo.mime as "image/jpeg" | "image/png" | "image/webp",
            data: base64,
          },
        };

  const respuesta = await anthropic().beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // Si un clasificador de seguridad rechaza el pedido, la API reintenta con otro modelo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(AnalisisSchema) },
    system: SISTEMA,
    messages: [
      {
        role: "user",
        content: [
          adjunto,
          {
            type: "text",
            text: `Datos que cargó la persona (pueden tener errores; si no coinciden con la factura, mencionalo en el resumen):
- Empresa: ${contexto.empresa}
- Servicio: ${contexto.servicio}
- Número de cliente: ${contexto.numero_cliente}
- Titular: ${contexto.titular}`,
          },
        ],
      },
    ],
  });

  if (respuesta.stop_reason === "refusal") throw new Error("No se pudo analizar esta factura.");
  if (respuesta.stop_reason === "max_tokens") throw new Error("La respuesta quedó incompleta.");
  if (!respuesta.parsed_output) throw new Error("No se pudo interpretar la respuesta del análisis.");
  return respuesta.parsed_output;
}
