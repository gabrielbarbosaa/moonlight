import { pageSchema, type Block, type BlockType, type PageContent } from '@sitebuilder/schemas';

export const BLOCK_LABELS: Record<BlockType, string> = {
  header: 'Cabeçalho',
  hero: 'Destaque',
  links: 'Links',
  text: 'Texto',
  footer: 'Rodapé',
};

export const BLOCK_ICONS = {
  header: 'heading',
  hero: 'sparkles',
  links: 'link',
  text: 'type',
  footer: 'footer',
} as const;

export const BLOCK_HINTS: Record<BlockType, string> = {
  header: 'Seu nome ou título, com foto opcional.',
  hero: 'A mensagem principal, com botão e imagem.',
  links: 'Botões e links para onde você quiser.',
  text: 'Um parágrafo, citação ou aviso.',
  footer: 'Uma linha final, como direitos ou contato.',
};

export const VARIANTS: Record<BlockType, { value: string; label: string }[]> = {
  header: [
    { value: 'simple', label: 'Simples' },
    { value: 'centered', label: 'Centralizado' },
    { value: 'with-avatar', label: 'Com foto' },
    { value: 'avatar-centered', label: 'Foto centralizada' },
    { value: 'banner', label: 'Faixa colorida' },
  ],
  hero: [
    { value: 'text', label: 'Texto' },
    { value: 'centered', label: 'Centralizado' },
    { value: 'card', label: 'Cartão' },
    { value: 'image-right', label: 'Imagem à direita' },
    { value: 'image-left', label: 'Imagem à esquerda' },
    { value: 'full-bleed', label: 'Imagem de fundo' },
  ],
  links: [
    { value: 'stacked', label: 'Botões' },
    { value: 'cards', label: 'Cartões' },
    { value: 'grid', label: 'Grade' },
    { value: 'pills', label: 'Pílulas' },
    { value: 'minimal', label: 'Lista simples' },
  ],
  text: [
    { value: 'paragraph', label: 'Parágrafo' },
    { value: 'lead', label: 'Destaque' },
    { value: 'quote', label: 'Citação' },
    { value: 'callout', label: 'Aviso' },
  ],
  footer: [
    { value: 'minimal', label: 'Mínimo' },
    { value: 'columns', label: 'À esquerda' },
    { value: 'band', label: 'Faixa' },
    { value: 'plain', label: 'Simples' },
  ],
};

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 90'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%236366f1'/><stop offset='1' stop-color='%23a855f7'/></linearGradient></defs><rect width='120' height='90' fill='url(%23g)'/><circle cx='84' cy='28' r='10' fill='white' fill-opacity='.7'/><path d='M0 90 L38 44 L62 70 L80 52 L120 90 Z' fill='white' fill-opacity='.55'/></svg>";

export function sampleBlock(type: BlockType, variant: string): Block {
  const id = `sample-${type}-${variant}`;
  switch (type) {
    case 'header':
      return { id, type, variant: variant as never, props: { title: 'Seu nome' } };
    case 'hero':
      return {
        id,
        type,
        variant: variant as never,
        props: {
          heading: 'Título',
          subheading: 'Um subtítulo curto',
          ctaLabel: 'Botão',
          ctaUrl: 'https://example.com',
        },
      };
    case 'links':
      return {
        id,
        type,
        variant: variant as never,
        props: {
          items: [
            { id: 'a', label: 'Link um', url: 'https://example.com/1' },
            { id: 'b', label: 'Link dois', url: 'https://example.com/2' },
          ],
        },
      };
    case 'text':
      return {
        id,
        type,
        variant: variant as never,
        props: { content: 'Um texto curto de exemplo para esta aparência.' },
      };
    case 'footer':
      return { id, type, variant: variant as never, props: { text: 'Rodapé da página' } };
  }
}

export function describeBlock(block: Block): string {
  switch (block.type) {
    case 'header':
      return block.props.title;
    case 'hero':
      return block.props.heading;
    case 'links':
      return block.props.items.length === 1 ? '1 link' : `${block.props.items.length} links`;
    case 'text':
      return block.props.content.trim().slice(0, 48) || 'Texto vazio';
    case 'footer':
      return block.props.text?.trim() || 'Rodapé vazio';
  }
}

export function mixHex(from: string, to: string, amount: number): string {
  const channel = (hex: string, offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  const blend = (offset: number) =>
    Math.round(channel(from, offset) + (channel(to, offset) - channel(from, offset)) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${blend(1)}${blend(3)}${blend(5)}`;
}

export function newId() {
  return crypto.randomUUID();
}

export function createBlock(type: BlockType): Block {
  const id = newId();
  switch (type) {
    case 'header':
      return { id, type, variant: 'simple', props: { title: 'Seu nome' } };
    case 'hero':
      return { id, type, variant: 'text', props: { heading: 'Seu título' } };
    case 'links':
      return { id, type, variant: 'stacked', props: { items: [] } };
    case 'text':
      return { id, type, variant: 'paragraph', props: { content: '' } };
    case 'footer':
      return { id, type, variant: 'minimal', props: { text: '' } };
  }
}

const OPTIONAL_PROPS = new Set([
  'avatarUrl',
  'subheading',
  'imageUrl',
  'ctaLabel',
  'ctaUrl',
  'text',
]);

const OPTIONAL_THEME = ['textColor', 'backgroundEnd', 'backgroundImageUrl'] as const;

const THEME_FIELD_LABELS: Record<string, string> = {
  primaryColor: 'cor principal',
  background: 'cor de fundo',
  backgroundEnd: 'segunda cor do degradê',
  backgroundImageUrl: 'imagem de fundo',
  textColor: 'cor do texto',
};

export function normalizePage(page: PageContent): PageContent {
  const theme: Record<string, unknown> = { ...page.theme };
  for (const key of OPTIONAL_THEME) {
    const value = theme[key];
    if (typeof value === 'string' && value.trim() === '') delete theme[key];
  }

  return {
    ...page,
    theme: theme as PageContent['theme'],
    blocks: page.blocks.map((block) => {
      const props = Object.fromEntries(
        Object.entries(block.props).filter(
          ([key, value]) =>
            !(OPTIONAL_PROPS.has(key) && typeof value === 'string' && value.trim() === ''),
        ),
      );
      return { ...block, props } as Block;
    }),
  };
}

export type ValidationResult =
  { valid: true; page: PageContent } | { valid: false; errors: string[] };

export function validatePage(page: PageContent): ValidationResult {
  const normalized = normalizePage(page);
  const result = pageSchema.safeParse(normalized);
  if (result.success) return { valid: true, page: result.data };

  const errors = result.error.issues.map((issue) => {
    if (issue.path[0] === 'theme') {
      const field = THEME_FIELD_LABELS[String(issue.path[1])] ?? String(issue.path[1] ?? '');
      return `Tema${field ? ` (${field})` : ''}: ${issue.message}`;
    }
    const [, index, ...rest] = issue.path;
    const block = typeof index === 'number' ? page.blocks[index] : undefined;
    const where =
      block && typeof index === 'number' ? `${BLOCK_LABELS[block.type]} ${index + 1}` : 'Página';
    const field = rest.filter((part) => part !== 'props').join(' › ');
    return `${where}${field ? ` (${field})` : ''}: ${issue.message}`;
  });
  return { valid: false, errors };
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
