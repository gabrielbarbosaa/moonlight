import { z } from 'zod';
import { SOCIAL_NETWORKS } from './social';
import { DEFAULT_THEME, themeSchema, type Theme } from './theme';
import { safeUrlSchema } from './url';
import { parseVideoUrl } from './video';

export { safeUrlSchema };

export const HEADER_VARIANTS = [
  'simple',
  'centered',
  'with-avatar',
  'avatar-centered',
  'banner',
] as const;
export const HERO_VARIANTS = [
  'text',
  'centered',
  'card',
  'image-right',
  'image-left',
  'full-bleed',
] as const;
export const LINKS_VARIANTS = ['stacked', 'cards', 'grid', 'pills', 'minimal'] as const;
export const TEXT_VARIANTS = ['paragraph', 'lead', 'quote', 'callout'] as const;
export const FOOTER_VARIANTS = ['minimal', 'columns', 'band', 'plain'] as const;

const linkItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(80),
  url: safeUrlSchema,
});

const blockBase = {
  id: z.string().min(1),
};

export const headerBlockSchema = z.object({
  ...blockBase,
  type: z.literal('header'),
  variant: z.enum(HEADER_VARIANTS).default('simple'),
  props: z.object({
    title: z.string().trim().min(1).max(80),
    avatarUrl: safeUrlSchema.optional(),
  }),
});

export const heroBlockSchema = z.object({
  ...blockBase,
  type: z.literal('hero'),
  variant: z.enum(HERO_VARIANTS).default('text'),
  props: z.object({
    heading: z.string().trim().min(1).max(120),
    subheading: z.string().trim().max(240).optional(),
    imageUrl: safeUrlSchema.optional(),
    ctaLabel: z.string().trim().max(40).optional(),
    ctaUrl: safeUrlSchema.optional(),
  }),
});

export const linksBlockSchema = z.object({
  ...blockBase,
  type: z.literal('links'),
  variant: z.enum(LINKS_VARIANTS).default('stacked'),
  props: z.object({
    items: z.array(linkItemSchema).max(30),
  }),
});

export const textBlockSchema = z.object({
  ...blockBase,
  type: z.literal('text'),
  variant: z.enum(TEXT_VARIANTS).default('paragraph'),
  props: z.object({
    // Texto puro: nunca HTML. O renderer escapa tudo.
    content: z.string().trim().max(2000),
  }),
});

export const footerBlockSchema = z.object({
  ...blockBase,
  type: z.literal('footer'),
  variant: z.enum(FOOTER_VARIANTS).default('minimal'),
  props: z.object({
    text: z.string().trim().max(200).optional(),
  }),
});

export const SOCIAL_VARIANTS = ['icons', 'filled', 'pills', 'list'] as const;
export const SOCIAL_COLOR_MODES = ['brand', 'theme', 'custom'] as const;
export const LINKLIST_VARIANTS = ['list', 'thumbs', 'numbered', 'cards'] as const;
export const CAROUSEL_VARIANTS = ['slides', 'cards'] as const;
export const GALLERY_VARIANTS = ['grid', 'columns', 'featured'] as const;
export const FAQ_VARIANTS = ['accordion', 'cards', 'plain'] as const;
export const VIDEO_VARIANTS = ['inline', 'card'] as const;
export const DIVIDER_VARIANTS = ['line', 'dots', 'space'] as const;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const socialBlockSchema = z.object({
  ...blockBase,
  type: z.literal('social'),
  variant: z.enum(SOCIAL_VARIANTS).default('icons'),
  props: z.object({
    colorMode: z.enum(SOCIAL_COLOR_MODES).default('brand'),
    color: hexColor.optional(),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          network: z.enum(SOCIAL_NETWORKS),
          url: safeUrlSchema,
          label: z.string().trim().max(40).optional(),
        }),
      )
      .max(20),
  }),
});

export const linklistBlockSchema = z.object({
  ...blockBase,
  type: z.literal('linklist'),
  variant: z.enum(LINKLIST_VARIANTS).default('list'),
  props: z.object({
    title: z.string().trim().max(80).optional(),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().trim().min(1).max(80),
          url: safeUrlSchema,
          description: z.string().trim().max(160).optional(),
          imageUrl: safeUrlSchema.optional(),
        }),
      )
      .max(30),
  }),
});

export const carouselBlockSchema = z.object({
  ...blockBase,
  type: z.literal('carousel'),
  variant: z.enum(CAROUSEL_VARIANTS).default('slides'),
  props: z.object({
    title: z.string().trim().max(80).optional(),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          imageUrl: safeUrlSchema,
          caption: z.string().trim().max(120).optional(),
          linkUrl: safeUrlSchema.optional(),
        }),
      )
      .max(20),
  }),
});

export const galleryBlockSchema = z.object({
  ...blockBase,
  type: z.literal('gallery'),
  variant: z.enum(GALLERY_VARIANTS).default('grid'),
  props: z.object({
    title: z.string().trim().max(80).optional(),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          imageUrl: safeUrlSchema,
          caption: z.string().trim().max(120).optional(),
        }),
      )
      .max(30),
  }),
});

export const faqBlockSchema = z.object({
  ...blockBase,
  type: z.literal('faq'),
  variant: z.enum(FAQ_VARIANTS).default('accordion'),
  props: z.object({
    title: z.string().trim().max(80).optional(),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          question: z.string().trim().min(1).max(160),
          answer: z.string().trim().min(1).max(800),
        }),
      )
      .max(20),
  }),
});

export const videoBlockSchema = z.object({
  ...blockBase,
  type: z.literal('video'),
  variant: z.enum(VIDEO_VARIANTS).default('inline'),
  props: z.object({
    url: z
      .string()
      .trim()
      .max(2048)
      .refine((value) => parseVideoUrl(value) !== null, {
        message: 'Use um link do YouTube ou do Vimeo',
      }),
    title: z.string().trim().max(120).optional(),
  }),
});

export const dividerBlockSchema = z.object({
  ...blockBase,
  type: z.literal('divider'),
  variant: z.enum(DIVIDER_VARIANTS).default('line'),
  props: z.object({}),
});

export const blockSchema = z.discriminatedUnion('type', [
  headerBlockSchema,
  heroBlockSchema,
  linksBlockSchema,
  textBlockSchema,
  footerBlockSchema,
  socialBlockSchema,
  linklistBlockSchema,
  carouselBlockSchema,
  galleryBlockSchema,
  faqBlockSchema,
  videoBlockSchema,
  dividerBlockSchema,
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block['type'];

/** Incrementar quando o formato dos blocos mudar (e escrever a migração). */
export const CURRENT_PAGE_SCHEMA_VERSION = 1;

export const pageSchema = z.object({
  schemaVersion: z.literal(CURRENT_PAGE_SCHEMA_VERSION),
  theme: themeSchema,
  blocks: z.array(blockSchema).max(50),
});
export type PageContent = z.infer<typeof pageSchema>;

export const starterPage = (title: string): PageContent => ({
  ...emptyPage(),
  blocks: [
    { id: 'header', type: 'header', variant: 'centered', props: { title } },
    {
      id: 'hero',
      type: 'hero',
      variant: 'text',
      props: { heading: 'Bem-vindo à minha página', subheading: 'Edite este conteúdo no painel.' },
    },
    { id: 'footer', type: 'footer', variant: 'minimal', props: { text: title } },
  ],
});

export const emptyPage = (): PageContent => ({
  schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
  theme: { ...DEFAULT_THEME },
  blocks: [],
});

export const samplePage = (theme: Theme, name = 'Marina Costa'): PageContent => ({
  schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
  theme,
  blocks: [
    { id: 'sample-header', type: 'header', variant: 'centered', props: { title: name } },
    {
      id: 'sample-hero',
      type: 'hero',
      variant: 'text',
      props: {
        heading: 'Design que conta histórias',
        subheading: 'Identidades visuais, sites e conteúdo para marcas autorais.',
        ctaLabel: 'Fale comigo',
        ctaUrl: 'https://example.com/contato',
      },
    },
    {
      id: 'sample-links',
      type: 'links',
      variant: 'stacked',
      props: {
        items: [
          { id: 'sample-link-1', label: 'Portfólio', url: 'https://example.com/portfolio' },
          { id: 'sample-link-2', label: 'Agendar uma conversa', url: 'https://example.com/agenda' },
          { id: 'sample-link-3', label: 'Instagram', url: 'https://example.com/instagram' },
        ],
      },
    },
    {
      id: 'sample-text',
      type: 'text',
      variant: 'quote',
      props: { content: 'Simples é sofisticado.' },
    },
    { id: 'sample-footer', type: 'footer', variant: 'minimal', props: { text: `© ${name}` } },
  ],
});
