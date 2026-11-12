'use client';

import { useEffect } from 'react';

const SELECTOR = '[data-animate]';

export const SCROLL_ANIMATION_BOOT_SCRIPT =
  "if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){document.documentElement.dataset.sbAnim='on'}";

export function ScrollAnimations() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const root = document.documentElement;
    root.dataset.sbAnim = 'on';

    const known = new WeakMap<Element, string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-in', '');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    const watch = (element: Element) => {
      const type = element.getAttribute('data-animate') ?? '';
      if (known.get(element) === type) return;
      known.set(element, type);
      element.removeAttribute('data-in');
      observer.observe(element);
    };

    const scan = (scope: ParentNode) => scope.querySelectorAll(SELECTOR).forEach(watch);
    scan(document);

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          if (record.target instanceof Element && record.target.matches(SELECTOR)) {
            watch(record.target);
          }
          continue;
        }
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR)) watch(node);
          scan(node);
        });
      }
    });
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-animate'],
    });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      delete root.dataset.sbAnim;
    };
  }, []);

  return null;
}
