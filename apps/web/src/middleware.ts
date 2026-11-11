import { NextResponse, type NextRequest } from 'next/server';
import { getTenantSlugFromHost } from './lib/tenant-host';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'localhost:3000';

/**
 * Resolução de tenant por subdomínio:
 *   maria.nossosite.com.br/qualquer  ->  /s/maria/qualquer (reescrita interna)
 *
 * No domínio raiz nada é reescrito, então landing e /admin funcionam normalmente.
 * O mesmo destino (/s/[tenant]) também é acessível diretamente como fallback por
 * caminho, para hospedagens gratuitas sem subdomínio wildcard.
 */
export function middleware(request: NextRequest) {
  const slug = getTenantSlugFromHost(request.headers.get('host'), ROOT_DOMAIN);

  if (!slug) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/s/${slug}${url.pathname === '/' ? '' : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Ignora arquivos estáticos e internos do Next.
  matcher: ['/((?!_next/|favicon.ico|.*\\..*).*)'],
};
