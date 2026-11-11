import { pageSchema, type Block, type BlockType, type PageContent } from '@sitebuilder/schemas';

export const BLOCK_LABELS: Record<BlockType, string> = {
  header: 'Cabeçalho',
  hero: 'Destaque',
  links: 'Links',
  text: 'Texto',
  footer: 'Rodapé',
};

export const VARIANTS: Record<BlockType, { value: string; label: string }[]> = {
  header: [
    { value: 'simple', label: 'Simples' },
    { value: 'centered', label: 'Centralizado' },
    { value: 'with-avatar', label: 'Com foto' },
  ],
  hero: [
    { value: 'text', label: 'Só texto' },
    { value: 'image-right', label: 'Imagem à direita' },
    { value: 'full-bleed', label: 'Imagem de fundo' },
  ],
  links: [
    { value: 'stacked', label: 'Lista' },
    { value: 'grid', label: 'Grade' },
    { value: 'pills', label: 'Pílulas' },
  ],
  text: [
    { value: 'paragraph', label: 'Parágrafo' },
    { value: 'quote', label: 'Citação' },
  ],
  footer: [
    { value: 'minimal', label: 'Mínimo' },
    { value: 'columns', label: 'Alinhado à esquerda' },
  ],
};

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

export function normalizePage(page: PageContent): PageContent {
  return {
    ...page,
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
