import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

// Destino del link de confirmación de email / link mágico.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const volver = searchParams.get("volver") ?? "/panel";
  const destino = volver.startsWith("/") && !volver.startsWith("//") ? volver : "/panel";

  if (code) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
