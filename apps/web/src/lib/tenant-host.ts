import { RESERVED_SLUGS } from '@moonlight/schemas';

/**
 * Extrai o slug do tenant a partir do header Host.
 *
 *   maria.localhost:3000      -> "maria"   (dev, ROOT_DOMAIN=localhost:3000)
 *   maria.nossosite.com.br    -> "maria"   (prod, ROOT_DOMAIN=nossosite.com.br)
 *   localhost:3000            -> null      (domínio raiz: landing e /admin)
 *   www.nossosite.com.br      -> null      (subdomínio reservado)
 */
export function getTenantSlugFromHost(host: string | null, rootDomain: string): string | null {
  if (!host) return null;

  const normalizedHost = host.toLowerCase();
  const normalizedRoot = rootDomain.toLowerCase();

  if (normalizedHost === normalizedRoot) return null;

  const suffix = `.${normalizedRoot}`;
  if (!normalizedHost.endsWith(suffix)) return null;

  const slug = normalizedHost.slice(0, -suffix.length);

  // Aceita só um nível de subdomínio (a.b.root não é um tenant válido).
  if (!slug || slug.includes('.')) return null;
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) return null;

  return slug;
}
