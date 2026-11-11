'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from './icons';

type Mode = 'auto' | 'light' | 'dark';

const ORDER: Mode[] = ['auto', 'light', 'dark'];
const LABELS: Record<Mode, string> = {
  auto: 'Tema automático',
  light: 'Tema claro',
  dark: 'Tema escuro',
};
const ICONS: Record<Mode, IconName> = { auto: 'monitor', light: 'sun', dark: 'moon' };

function readStored(): Mode {
  try {
    const stored = localStorage.getItem('sb-theme');
    return stored === 'light' || stored === 'dark' ? stored : 'auto';
  } catch {
    return 'auto';
  }
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('auto');

  useEffect(() => {
    setMode(readStored());
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    setMode(next);
    try {
      if (next === 'auto') localStorage.removeItem('sb-theme');
      else localStorage.setItem('sb-theme', next);
    } catch {
      return;
    } finally {
      if (next === 'auto') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = next;
    }
  };

  return (
    <button
      type="button"
      className="btn-ghost icon-button"
      onClick={cycle}
      aria-label={LABELS[mode]}
      title={LABELS[mode]}
    >
      <Icon name={ICONS[mode]} />
    </button>
  );
}
