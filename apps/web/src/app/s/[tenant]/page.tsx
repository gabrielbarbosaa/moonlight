import { PageRenderer } from '@sitebuilder/renderer';
import type { PageContent } from '@sitebuilder/schemas';
import { notFound } from 'next/navigation';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type PublicTenant = { slug: string; name: string; page: PageContent | null };

async function fetchTenant(slug: string): Promise<PublicTenant | null> {
  const response = await fetch(`${API_URL}/tenants/public/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`Falha ao carregar o tenant (${response.status})`);
  return response.json();
}

export default async function TenantPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await fetchTenant(slug);

  if (!tenant) notFound();

  if (!tenant.page) {
    return (
      <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 16px' }}>
        <h1>{tenant.name}</h1>
        <p>Esta página ainda não foi publicada.</p>
      </main>
    );
  }

  return <PageRenderer content={tenant.page} />;
}
