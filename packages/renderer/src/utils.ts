import { safeUrlSchema } from '@sitebuilder/schemas';

export function safeHref(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const result = safeUrlSchema.safeParse(value);
  return result.success ? new URL(result.data).href : undefined;
}

export function readableTextColor(background: string): string {
  const hex = background.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#111827' : '#f9fafb';
}

export const FONT_STACKS = {
  sans: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;
