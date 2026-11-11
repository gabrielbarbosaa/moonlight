import { safeUrlSchema, type FontId, type Theme } from '@moonlight/schemas';
import type { CSSProperties } from 'react';

export function safeHref(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const result = safeUrlSchema.safeParse(value);
  return result.success ? new URL(result.data).href : undefined;
}

export function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function readableTextColor(background: string): string {
  return luminance(background) > 0.55 ? '#111827' : '#f9fafb';
}

export const FONT_STACKS: Record<FontId, string> = {
  modern:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  sans: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  elegant: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  rounded:
    'ui-rounded, "SF Pro Rounded", Nunito, Quicksand, "Hiragino Maru Gothic ProN", "Segoe UI", system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

const RADIUS_PX = { none: 0, small: 8, medium: 14, large: 24 } as const;
const BUTTON_RADIUS_PX = { rounded: 12, pill: 999, square: 0 } as const;
const GAP_PX = { compact: 16, comfortable: 28, spacious: 44 } as const;
const WIDTH_PX = { narrow: 520, medium: 720, wide: 960 } as const;

export function themeStyle(theme: Theme): CSSProperties {
  const endColor = theme.backgroundEnd ?? theme.background;
  const imageHref =
    theme.backgroundType === 'image' ? safeHref(theme.backgroundImageUrl) : undefined;

  let backgroundImage = 'none';
  if (theme.backgroundType === 'gradient') {
    backgroundImage = `linear-gradient(160deg, ${theme.background}, ${endColor})`;
  } else if (imageHref) {
    const veil = `color-mix(in srgb, ${theme.background} 62%, transparent)`;
    backgroundImage = `linear-gradient(${veil}, ${veil}), url("${imageHref}")`;
  }

  const averageLuminance =
    theme.backgroundType === 'gradient'
      ? (luminance(theme.background) + luminance(endColor)) / 2
      : luminance(theme.background);
  const text = theme.textColor ?? (averageLuminance > 0.55 ? '#111827' : '#f9fafb');

  return {
    '--sb-primary': theme.primaryColor,
    '--sb-on-primary': readableTextColor(theme.primaryColor),
    '--sb-bg-color': theme.background,
    '--sb-bg-image': backgroundImage,
    '--sb-text': text,
    '--sb-font': FONT_STACKS[theme.font],
    '--sb-radius': `${RADIUS_PX[theme.radius]}px`,
    '--sb-btn-radius': `${BUTTON_RADIUS_PX[theme.buttonShape]}px`,
    '--sb-gap': `${GAP_PX[theme.spacing]}px`,
    '--sb-width': `${WIDTH_PX[theme.width]}px`,
  } as CSSProperties;
}
