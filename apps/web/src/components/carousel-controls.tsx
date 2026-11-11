'use client';

import { useEffect } from 'react';

export function CarouselControls() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
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
