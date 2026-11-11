'use client';

import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const VIEW_WINDOW_MS = 30 * 60 * 1000;

function send(payload: { slug: string; type: 'view' | 'click'; linkId?: string }) {
  fetch(`${API_URL}/analytics/track`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

function shouldCountView(slug: string) {
  const storageKey = `sb:view:${slug}`;
  try {
    const last = Number(sessionStorage.getItem(storageKey) ?? 0);
    if (Date.now() - last < VIEW_WINDOW_MS) return false;
    sessionStorage.setItem(storageKey, String(Date.now()));
  } catch {
    return true;
  }
  return true;
}

export function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    if (shouldCountView(slug)) send({ slug, type: 'view' });

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLElement>('a[data-track-link]');
      const linkId = link?.dataset.trackLink;
      if (linkId) send({ slug, type: 'click', linkId });
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [slug]);

  return null;
}
