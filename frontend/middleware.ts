import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Protege todas as rotas autenticadas. Sem cookie de sessão → redireciona para
 * /login. O matcher exclui /login, o hotsite público /v/*, rotas de API, assets
 * do Next e arquivos estáticos. O refresh do access token acontece no cliente.
 */
export function middleware(req: NextRequest) {
  const hasSession =
    req.cookies.has('access_token') || req.cookies.has('refresh_token');

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|v/|api|_next/static|_next/image|favicon.ico).*)'],
};
