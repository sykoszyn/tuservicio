import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/server";

/** Nonce de un solo uso para firmar el ingreso con Lemon. */
export async function POST() {
  const nonce = randomBytes(16).toString("hex");
  const admin = crearClienteAdmin();
  const { error } = await admin.from("lemon_nonces").insert({ nonce });
  if (error) {
    console.error("Error creando nonce de Lemon:", error);
    return NextResponse.json({ error: "No se pudo iniciar el ingreso." }, { status: 500 });
  }
  // Limpieza de nonces viejos (más de 1 día).
  await admin.from("lemon_nonces").delete().lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  return NextResponse.json({ nonce });
}
