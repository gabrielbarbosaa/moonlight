import { PageRenderer } from '@moonlight/renderer';
import type { PageContent } from '@moonlight/schemas';
import { notFound } from 'next/navigation';
import { AgendaLink } from '@/components/agenda-link';
import { ReportLink } from '@/components/report-link';
import { CarouselControls } from '@/components/carousel-controls';
import { SCROLL_ANIMATION_BOOT_SCRIPT, ScrollAnimations } from '@/components/scroll-animations';
import { TrackView } from '@/components/track-view';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type PublicTenant = {
  slug: string;
  name: string;
  bookingEnabled: boolean;
  page: PageContent | null;
};

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
      <div className="app">
        <main className="page page-narrow">
          <div className="card" style={{ textAlign: 'center' }}>
            <h1>{tenant.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              Esta página ainda não foi publicada.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const animated = tenant.page.blocks.some(
    (block) => block.animation && block.animation !== 'none',
  );

  return (
    <>
      {animated && <script dangerouslySetInnerHTML={{ __html: SCROLL_ANIMATION_BOOT_SCRIPT }} />}
      <PageRenderer
        content={tenant.page}
        after={
          <>
            {tenant.bookingEnabled && <AgendaLink slug={tenant.slug} />}
            <ReportLink slug={tenant.slug} />
          </>
        }
      />
      <TrackView slug={tenant.slug} />
      <CarouselControls />
      {animated && <ScrollAnimations />}
    </>
  );
}
