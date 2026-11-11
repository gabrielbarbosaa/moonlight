import { z } from 'zod';

/**
 * Motor de blocos: a página é uma lista ordenada de blocos.
 * O mesmo schema valida o editor (front) e a API (back).
 */

/** Só aceita http(s) e mailto, bloqueando `javascript:` e similares. */
export const safeUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return ['http:', 'https:', 'mailto:'].includes(url.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL inválida' },
  );

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
  variant: z.enum(['simple', 'centered', 'with-avatar']).default('simple'),
  props: z.object({
    title: z.string().trim().min(1).max(80),
    avatarUrl: safeUrlSchema.optional(),
  }),
});

export const heroBlockSchema = z.object({
  ...blockBase,
  type: z.literal('hero'),
  variant: z.enum(['text', 'image-right', 'full-bleed']).default('text'),
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
  variant: z.enum(['stacked', 'grid', 'pills']).default('stacked'),
  props: z.object({
    items: z.array(linkItemSchema).max(30),
  }),
});

export const textBlockSchema = z.object({
  ...blockBase,
  type: z.literal('text'),
  variant: z.enum(['paragraph', 'quote']).default('paragraph'),
  props: z.object({
    // Texto puro: nunca HTML. O renderer escapa tudo.
    content: z.string().trim().max(2000),
  }),
});

export const footerBlockSchema = z.object({
  ...blockBase,
  type: z.literal('footer'),
  variant: z.enum(['minimal', 'columns']).default('minimal'),
  props: z.object({
    text: z.string().trim().max(200).optional(),
  }),
});

export const blockSchema = z.discriminatedUnion('type', [
  headerBlockSchema,
  heroBlockSchema,
  linksBlockSchema,
  textBlockSchema,
  footerBlockSchema,
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block['type'];

/** Incrementar quando o formato dos blocos mudar (e escrever a migração). */
export const CURRENT_PAGE_SCHEMA_VERSION = 1;

export const pageSchema = z.object({
  schemaVersion: z.literal(CURRENT_PAGE_SCHEMA_VERSION),
  theme: z.object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    font: z.enum(['sans', 'serif', 'mono']).default('sans'),
  }),
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
  theme: { primaryColor: '#4f46e5', background: '#ffffff', font: 'sans' },
  blocks: [],
});
