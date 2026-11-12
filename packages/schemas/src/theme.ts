import { z } from 'zod';
import { safeUrlSchema } from './url';

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const FONT_IDS = ['modern', 'sans', 'serif', 'elegant', 'rounded', 'mono'] as const;
export const BACKGROUND_TYPES = ['solid', 'gradient', 'image'] as const;
export const BUTTON_STYLES = ['solid', 'outline', 'soft'] as const;
export const BUTTON_SHAPES = ['rounded', 'pill', 'square'] as const;
export const RADII = ['none', 'small', 'medium', 'large'] as const;
export const SPACINGS = ['compact', 'comfortable', 'spacious'] as const;
export const WIDTHS = ['narrow', 'medium', 'wide'] as const;

export type FontId = (typeof FONT_IDS)[number];

export const THEME_LABELS = {
  font: {
    modern: 'Moderna',
    sans: 'Sem serifa',
    serif: 'Serifada',
    elegant: 'Elegante',
    rounded: 'Arredondada',
    mono: 'Monoespaçada',
  },
  backgroundType: { solid: 'Cor sólida', gradient: 'Degradê', image: 'Imagem' },
  buttonStyle: { solid: 'Preenchido', outline: 'Contorno', soft: 'Suave' },
  buttonShape: { rounded: 'Arredondado', pill: 'Pílula', square: 'Reto' },
  radius: { none: 'Nenhum', small: 'Pequeno', medium: 'Médio', large: 'Grande' },
  spacing: { compact: 'Compacto', comfortable: 'Confortável', spacious: 'Amplo' },
  width: { narrow: 'Estreita', medium: 'Média', wide: 'Larga' },
} as const;

export const themeSchema = z.object({
  primaryColor: hexColorSchema,
  background: hexColorSchema,
  font: z.enum(FONT_IDS).default('sans'),
  textColor: hexColorSchema.optional(),
  backgroundType: z.enum(BACKGROUND_TYPES).default('solid'),
  backgroundEnd: hexColorSchema.optional(),
  backgroundImageUrl: safeUrlSchema.optional(),
  buttonStyle: z.enum(BUTTON_STYLES).default('solid'),
  buttonShape: z.enum(BUTTON_SHAPES).default('rounded'),
  radius: z.enum(RADII).default('medium'),
  spacing: z.enum(SPACINGS).default('comfortable'),
  width: z.enum(WIDTHS).default('medium'),
});
export type Theme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: Theme = {
  primaryColor: '#4f46e5',
  background: '#ffffff',
  font: 'modern',
  backgroundType: 'solid',
  buttonStyle: 'solid',
  buttonShape: 'rounded',
  radius: 'medium',
  spacing: 'comfortable',
  width: 'medium',
};

export type ThemePreset = { id: string; name: string; theme: Theme };

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'indigo', name: 'Índigo', theme: DEFAULT_THEME },
  {
    id: 'oceano',
    name: 'Oceano',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#0e7490',
      background: '#ecfeff',
      backgroundType: 'gradient',
      backgroundEnd: '#bae6fd',
      font: 'rounded',
      buttonShape: 'pill',
      radius: 'large',
    },
  },
  {
    id: 'floresta',
    name: 'Floresta',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#15803d',
      background: '#f0fdf4',
      font: 'serif',
      buttonStyle: 'soft',
      radius: 'small',
    },
  },
  {
    id: 'por-do-sol',
    name: 'Pôr do sol',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#c2410c',
      background: '#fff7ed',
      backgroundType: 'gradient',
      backgroundEnd: '#fed7aa',
      font: 'rounded',
      buttonShape: 'pill',
      radius: 'large',
      spacing: 'spacious',
    },
  },
  {
    id: 'meia-noite',
    name: 'Meia-noite',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#a78bfa',
      background: '#0f172a',
      font: 'modern',
      radius: 'medium',
    },
  },
  {
    id: 'rosa',
    name: 'Rosa',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#db2777',
      background: '#fdf2f8',
      font: 'elegant',
      buttonStyle: 'outline',
      buttonShape: 'pill',
    },
  },
  {
    id: 'papel',
    name: 'Papel',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#111827',
      background: '#faf7f2',
      font: 'serif',
      buttonShape: 'square',
      radius: 'none',
      spacing: 'spacious',
      width: 'narrow',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#22d3ee',
      background: '#0b1020',
      backgroundType: 'gradient',
      backgroundEnd: '#1e1b4b',
      font: 'mono',
      buttonStyle: 'outline',
      buttonShape: 'square',
      radius: 'small',
    },
  },
  {
    id: 'barbearia',
    name: 'Barbearia',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#d4a24c',
      background: '#14100e',
      backgroundType: 'gradient',
      backgroundEnd: '#2a1d14',
      font: 'elegant',
      buttonShape: 'square',
      radius: 'small',
    },
  },
  {
    id: 'minimalista',
    name: 'Minimalista',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#111111',
      background: '#ffffff',
      font: 'sans',
      buttonStyle: 'outline',
      buttonShape: 'square',
      radius: 'none',
      spacing: 'spacious',
      width: 'narrow',
    },
  },
  {
    id: 'lavanda',
    name: 'Lavanda',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#6d28d9',
      background: '#f5f3ff',
      backgroundType: 'gradient',
      backgroundEnd: '#ddd6fe',
      font: 'rounded',
      buttonShape: 'pill',
      radius: 'large',
    },
  },
  {
    id: 'cafe',
    name: 'Café',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#7f4f24',
      background: '#f5ebe0',
      font: 'serif',
      buttonStyle: 'soft',
      radius: 'medium',
      spacing: 'spacious',
    },
  },
  {
    id: 'menta',
    name: 'Menta',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#047857',
      background: '#ecfdf5',
      backgroundType: 'gradient',
      backgroundEnd: '#a7f3d0',
      font: 'rounded',
      buttonShape: 'pill',
      radius: 'large',
    },
  },
  {
    id: 'vinho',
    name: 'Vinho',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#fb7185',
      background: '#2b0a14',
      backgroundType: 'gradient',
      backgroundEnd: '#4a0d22',
      font: 'elegant',
      buttonStyle: 'outline',
      radius: 'medium',
    },
  },
  {
    id: 'grafite',
    name: 'Grafite',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#e4e4e7',
      background: '#18181b',
      font: 'modern',
      buttonShape: 'square',
      radius: 'small',
    },
  },
  {
    id: 'retro',
    name: 'Retrô',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#b91c1c',
      background: '#fef3c7',
      font: 'mono',
      buttonShape: 'square',
      radius: 'none',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#34d399',
      background: '#0f172a',
      backgroundType: 'gradient',
      backgroundEnd: '#134e4a',
      font: 'modern',
      buttonStyle: 'soft',
      buttonShape: 'pill',
      radius: 'large',
    },
  },
  {
    id: 'algodao-doce',
    name: 'Algodão-doce',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#be185d',
      background: '#fdf2f8',
      backgroundType: 'gradient',
      backgroundEnd: '#e0f2fe',
      font: 'rounded',
      buttonShape: 'pill',
      radius: 'large',
      spacing: 'spacious',
    },
  },
];
