import { NextResponse, type NextRequest } from "next/server";

/**
 * Barreira rápida: sem cookie de sessão, nem chega a renderizar as áreas restritas.
 * A verificação real (sessão válida + papel) acontece no servidor, em cada página,
 * ação e rota de API (src/server/session.ts).
 */
export function middleware(req: NextRequest) {
  const has = req.cookies.has("fdl_session");
  const { pathname } = req.nextUrl;
  if (!has && pathname.startsWith("/admin")) return NextResponse.redirect(new URL("/acesso-profissional", req.url));
  if (!has && pathname.startsWith("/paciente")) {
    const url = new URL("/entrar", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (!has && pathname.startsWith("/api/") ) return new NextResponse("Não autorizado", { status: 401 });
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/paciente/:path*", "/api/:path*"] };
