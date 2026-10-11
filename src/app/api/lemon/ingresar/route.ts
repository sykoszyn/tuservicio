import { NextResponse } from "next/server";
import { createPublicClient, getAddress, http, isAddress } from "viem";
import { z } from "zod";
import { LEMON_CHAIN } from "@/lib/lemon";
import { crearClienteAdmin, crearClienteServidor } from "@/lib/supabase/server";

const Datos = z.object({
  wallet: z.string().refine(isAddress, "Billetera inválida"),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
  message: z.string().max(4000),
  nonce: z.string().regex(/^[0-9a-f]{32}$/),
  claims: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
});

const VIGENCIA_NONCE_MS = 10 * 60 * 1000;

/**
 * Verifica la firma SIWE que devuelve Lemon y abre una sesión de Supabase para esa billetera.
 * Si es la primera vez, crea la cuenta.
 */
export async function POST(req: Request) {
  const r = Datos.safeParse(await req.json().catch(() => null));
  if (!r.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { signature, message, nonce, claims } = r.data;
  const wallet = getAddress(r.data.wallet);
  const admin = crearClienteAdmin();

  // 1. El nonce tiene que existir, no estar usado y ser reciente. Lo marcamos usado de forma atómica.
  const { data: usado } = await admin
    .from("lemon_nonces")
    .update({ usado: true })
    .eq("nonce", nonce)
    .eq("usado", false)
    .gte("created_at", new Date(Date.now() - VIGENCIA_NONCE_MS).toISOString())
    .select("nonce")
    .maybeSingle();
  if (!usado) return NextResponse.json({ error: "El ingreso venció. Probá de nuevo." }, { status: 401 });

  // 2. La firma tiene que ser válida, de esa billetera y con ese nonce.
  const cliente = createPublicClient({ chain: LEMON_CHAIN, transport: http() });
  const valida = await cliente
    .verifySiweMessage({ message, signature: signature as `0x${string}`, address: wallet, nonce })
    .catch((e) => {
      console.error("Error verificando firma de Lemon:", e);
      return false;
    });
  if (!valida) return NextResponse.json({ error: "No pudimos verificar tu cuenta de Lemon." }, { status: 401 });

  // 3. Buscamos la cuenta de esa billetera o la creamos.
  const claim = (k: string) => claims.find((c) => c.key === k)?.value?.trim() || undefined;
  const nombre = [claim("NAME"), claim("LAST_NAME")].filter(Boolean).join(" ") || undefined;
  const email = `${wallet.toLowerCase()}@lemon.tuservicio.app`;

  const { data: perfil } = await admin.from("perfiles").select("id").eq("wallet", wallet).maybeSingle();
  if (!perfil) {
    const { data: creado, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: { provider: "lemon", providers: ["lemon"] },
      user_metadata: { nombre, wallet, lemontag: claim("LEMONTAG"), email_contacto: claim("EMAIL") },
    });
    if (error || !creado.user) {
      console.error("Error creando usuario de Lemon:", error);
      return NextResponse.json({ error: "No pudimos crear tu cuenta." }, { status: 500 });
    }
    await admin.from("perfiles").update({ wallet }).eq("id", creado.user.id);
  }

  // 4. Abrimos la sesión: generamos un link de ingreso y lo canjeamos acá mismo (deja las cookies).
  const { data: link, error: errLink } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (errLink || !link.properties?.hashed_token) {
    console.error("Error generando sesión de Lemon:", errLink);
    return NextResponse.json({ error: "No pudimos iniciar tu sesión." }, { status: 500 });
  }
  const supabase = await crearClienteServidor();
  const { error: errSesion } = await supabase.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  if (errSesion) {
    console.error("Error abriendo sesión de Lemon:", errSesion);
    return NextResponse.json({ error: "No pudimos iniciar tu sesión." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
