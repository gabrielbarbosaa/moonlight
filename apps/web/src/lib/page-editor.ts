import { pageSchema, type Block, type BlockType, type PageContent } from '@moonlight/schemas';

export const BLOCK_LABELS: Record<BlockType, string> = {
  header: 'Cabeçalho',
  hero: 'Destaque',
  links: 'Links',
  text: 'Texto',
  footer: 'Rodapé',
  social: 'Redes sociais',
  linklist: 'Lista de links',
  carousel: 'Carrossel',
  gallery: 'Galeria',
  faq: 'Perguntas frequentes',
  video: 'Vídeo',
  divider: 'Divisor',
};

export const BLOCK_ICONS = {
  header: 'heading',
  hero: 'sparkles',
  links: 'link',
  text: 'type',
  footer: 'footer',
  social: 'share',
  linklist: 'list',
  carousel: 'images',
  gallery: 'grid',
  faq: 'help',
  video: 'video',
  divider: 'minus',
} as const;

export const BLOCK_HINTS: Record<BlockType, string> = {
  header: 'Seu nome ou título, com foto opcional.',
  hero: 'A mensagem principal, com botão e imagem.',
  links: 'Botões e links para onde você quiser.',
  text: 'Um parágrafo, citação ou aviso.',
  footer: 'Uma linha final, como direitos ou contato.',
  social: 'Ícones das suas redes, coloridos ou na cor que você escolher.',
  linklist: 'Uma lista de links com descrição e miniatura.',
  carousel: 'Imagens que deslizam, com legenda e link.',
  gallery: 'Uma grade de fotos.',
  faq: 'Perguntas e respostas que abrem e fecham.',
  video: 'Um vídeo do YouTube ou do Vimeo.',
  divider: 'Uma linha, pontos ou um respiro entre seções.',
};

export const VARIANTS: Record<BlockType, { value: string; label: string }[]> = {
  header: [
    { value: 'simple', label: 'Simples' },
    { value: 'centered', label: 'Centralizado' },
    { value: 'with-avatar', label: 'Com foto' },
    { value: 'avatar-centered', label: 'Foto centralizada' },
    { value: 'banner', label: 'Faixa colorida' },
    { value: 'navbar', label: 'Barra de navegação' },
    { value: 'navbar-center', label: 'Barra com marca ao centro' },
    { value: 'navbar-pill', label: 'Barra flutuante' },
    { value: 'navbar-solid', label: 'Barra colorida' },
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
  social: [
    { value: 'icons', label: 'Ícones' },
    { value: 'filled', label: 'Ícones preenchidos' },
    { value: 'pills', label: 'Com nome' },
    { value: 'list', label: 'Lista' },
  ],
  linklist: [
    { value: 'list', label: 'Lista' },
    { value: 'thumbs', label: 'Com miniatura' },
    { value: 'numbered', label: 'Numerada' },
    { value: 'cards', label: 'Cartões' },
  ],
  carousel: [
    { value: 'slides', label: 'Um por vez' },
    { value: 'cards', label: 'Vários cartões' },
  ],
  gallery: [
    { value: 'grid', label: 'Grade' },
    { value: 'columns', label: 'Colunas' },
    { value: 'featured', label: 'Destaque' },
  ],
  faq: [
    { value: 'accordion', label: 'Sanfona' },
    { value: 'cards', label: 'Cartões' },
    { value: 'plain', label: 'Aberto' },
  ],
  video: [
    { value: 'inline', label: 'Simples' },
    { value: 'card', label: 'Cartão' },
  ],
  divider: [
    { value: 'line', label: 'Linha' },
    { value: 'dots', label: 'Pontos' },
    { value: 'space', label: 'Espaço' },
  ],
};

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 90'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%236366f1'/><stop offset='1' stop-color='%23a855f7'/></linearGradient></defs><rect width='120' height='90' fill='url(%23g)'/><circle cx='84' cy='28' r='10' fill='white' fill-opacity='.7'/><path d='M0 90 L38 44 L62 70 L80 52 L120 90 Z' fill='white' fill-opacity='.55'/></svg>";

export function sampleBlock(type: BlockType, variant: string): Block {
  const id = `sample-${type}-${variant}`;
  switch (type) {
    case 'header':
      return {
        id,
        type,
        variant: variant as never,
        props: {
          title: 'Seu nome',
          links: [
            { id: 'n1', label: 'Sobre', url: 'https://example.com/1' },
            { id: 'n2', label: 'Serviços', url: 'https://example.com/2' },
          ],
          ctaLabel: 'Contato',
          ctaUrl: 'https://example.com/3',
        },
      };
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
    case 'social':
      return {
        id,
        type,
        variant: variant as never,
        props: {
          colorMode: 'brand',
          items: [
            { id: 'a', network: 'instagram', url: 'https://example.com/1' },
            { id: 'b', network: 'youtube', url: 'https://example.com/2' },
            { id: 'c', network: 'github', url: 'https://example.com/3' },
            { id: 'd', network: 'email', url: 'mailto:oi@example.com' },
          ],
        },
      };
    case 'linklist':
      return {
        id,
        type,
        variant: variant as never,
        props: {
          items: [
            {
              id: 'a',
              label: 'Meu portfólio',
              url: 'https://example.com/1',
              description: 'Trabalhos recentes',
              imageUrl: '',
            },
            {
              id: 'b',
              label: 'Newsletter',
              url: 'https://example.com/2',
              description: 'Toda semana',
              imageUrl: '',
            },
          ],
        },
      };
    case 'carousel':
      return {
        id,
        type,
        variant: variant as never,
        props: {
          items: [
            { id: 'a', imageUrl: '', caption: 'Primeira' },
            { id: 'b', imageUrl: '', caption: 'Segunda' },
            { id: 'c', imageUrl: '', caption: 'Terceira' },
          ],
        },
      };
    case 'gallery':
      return {
        id,
        type,
        variant: variant as never,
        props: {
          items: [
            { id: 'a', imageUrl: '' },
            { id: 'b', imageUrl: '' },
            { id: 'c', imageUrl: '' },
            { id: 'd', imageUrl: '' },
            { id: 'e', imageUrl: '' },
          ],
        },
      };
    case 'faq':
      return {
        id,
        type,
        variant: variant as never,
        props: {
          items: [
            { id: 'a', question: 'Como funciona?', answer: 'Uma resposta curta e direta.' },
            { id: 'b', question: 'Quanto custa?', answer: 'Outra resposta de exemplo.' },
          ],
        },
      };
    case 'video':
      return {
        id,
        type,
        variant: variant as never,
        props: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Meu vídeo' },
      };
    case 'divider':
      return { id, type, variant: variant as never, props: {} };
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
    case 'social':
      return count(block.props.items.length, 'rede', 'redes');
    case 'linklist':
      return block.props.title?.trim() || count(block.props.items.length, 'link', 'links');
    case 'carousel':
      return block.props.title?.trim() || count(block.props.items.length, 'imagem', 'imagens');
    case 'gallery':
      return block.props.title?.trim() || count(block.props.items.length, 'foto', 'fotos');
    case 'faq':
      return block.props.title?.trim() || count(block.props.items.length, 'pergunta', 'perguntas');
    case 'video':
      return block.props.title?.trim() || block.props.url || 'Sem vídeo';
    case 'divider':
      return DIVIDER_LABELS[block.variant];
  }
}

const DIVIDER_LABELS = { line: 'Linha', dots: 'Pontos', space: 'Espaço' } as const;

function count(total: number, singular: string, plural: string) {
  return `${total} ${total === 1 ? singular : plural}`;
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
    case 'social':
      return { id, type, variant: 'icons', props: { colorMode: 'brand', items: [] } };
    case 'linklist':
      return { id, type, variant: 'list', props: { items: [] } };
    case 'carousel':
      return { id, type, variant: 'slides', props: { items: [] } };
    case 'gallery':
      return { id, type, variant: 'grid', props: { items: [] } };
    case 'faq':
      return { id, type, variant: 'accordion', props: { items: [] } };
    case 'video':
      return { id, type, variant: 'inline', props: { url: '' } };
    case 'divider':
      return { id, type, variant: 'line', props: {} };
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

const OPTIONAL_BLOCK_PROPS: Partial<Record<BlockType, string[]>> = {
  social: ['color'],
  linklist: ['title'],
  carousel: ['title'],
  gallery: ['title'],
  faq: ['title'],
  video: ['title'],
};

const OPTIONAL_ITEM_PROPS: Partial<Record<BlockType, string[]>> = {
  social: ['label'],
  linklist: ['description', 'imageUrl'],
  carousel: ['caption', 'linkUrl'],
  gallery: ['caption'],
};

const isBlank = (value: unknown) => typeof value === 'string' && value.trim() === '';

const OPTIONAL_THEME = ['textColor', 'backgroundEnd', 'backgroundImageUrl'] as const;

const THEME_FIELD_LABELS: Record<string, string> = {
  primaryColor: 'cor principal',
  background: 'cor de fundo',
  backgroundEnd: 'segunda cor do degradê',
  backgroundImageUrl: 'imagem de fundo',
  textColor: 'cor do texto',
};

const PROP_LABELS: Record<string, string> = {
  title: 'título',
  heading: 'título',
  subheading: 'subtítulo',
  avatarUrl: 'foto',
  imageUrl: 'imagem',
  linkUrl: 'link',
  url: 'link',
  label: 'texto',
  caption: 'legenda',
  description: 'descrição',
  network: 'rede',
  question: 'pergunta',
  answer: 'resposta',
  ctaLabel: 'texto do botão',
  ctaUrl: 'link do botão',
  content: 'conteúdo',
  text: 'texto',
  color: 'cor',
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
      const optional = new Set([...OPTIONAL_PROPS, ...(OPTIONAL_BLOCK_PROPS[block.type] ?? [])]);
      const optionalItem = new Set(OPTIONAL_ITEM_PROPS[block.type] ?? []);
      const props = Object.fromEntries(
        Object.entries(block.props)
          .filter(([key, value]) => !(optional.has(key) && isBlank(value)))
          .map(([key, value]) => [
            key,
            key === 'items' && Array.isArray(value)
              ? value.map((item: Record<string, unknown>) =>
                  Object.fromEntries(
                    Object.entries(item).filter(
                      ([itemKey, itemValue]) => !(optionalItem.has(itemKey) && isBlank(itemValue)),
                    ),
                  ),
                )
              : value,
          ]),
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
    const field = rest
      .filter((part) => part !== 'props' && part !== 'items')
      .map((part) =>
        typeof part === 'number' ? `item ${part + 1}` : (PROP_LABELS[part] ?? String(part)),
      )
      .join(' › ');
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
