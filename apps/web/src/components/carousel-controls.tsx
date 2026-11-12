'use client';

import { useEffect } from 'react';

const ANCHOR_OFFSET = 88;

export function CarouselControls() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;

      const anchor = target?.closest<HTMLAnchorElement>('a[href^="#b-"]');
      if (anchor) {
        anchor.closest('details')?.removeAttribute('open');
        const frame = anchor.closest<HTMLElement>('.preview-frame');
        if (frame) {
          event.preventDefault();
          const spot = frame.querySelector<HTMLElement>(
            `#${CSS.escape(anchor.getAttribute('href')?.slice(1) ?? '')}`,
          );
          if (spot) {
            const top =
              spot.getBoundingClientRect().top -
              frame.getBoundingClientRect().top +
              frame.scrollTop -
              ANCHOR_OFFSET;
            frame.scrollTo({ top, behavior: 'smooth' });
          }
        }
        return;
      }

      const button = target?.closest<HTMLElement>('[data-carousel-dir]');
      if (!button) return;
      const track = button.parentElement?.querySelector<HTMLElement>('.sbp-carousel-track');
      if (!track) return;
      const direction = Number(button.dataset.carouselDir) || 1;
      track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
