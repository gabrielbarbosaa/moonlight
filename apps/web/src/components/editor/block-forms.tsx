'use client';

import {
  ANIMATION_LABELS,
  ANIMATION_TYPES,
  SOCIAL_LABELS,
  SOCIAL_NETWORKS,
  SOCIAL_PLACEHOLDERS,
  parseVideoUrl,
  type Block,
  type SocialNetwork,
  type Theme,
} from '@moonlight/schemas';
import { ColorField, OptionRow, SelectField, TextField } from './fields';
import { ImageField } from './image-field';
import { ItemList } from './item-list';
import { VariantPicker } from './variant-picker';

type BlockOf<T extends Block['type']> = Extract<Block, { type: T }>;

type FormProps<T extends Block['type']> = {
  block: BlockOf<T>;
  onChange: (block: BlockOf<T>) => void;
};

function HeaderForm({ block, onChange }: FormProps<'header'>) {
  const needsAvatar = block.variant === 'with-avatar' || block.variant === 'avatar-centered';

  return (
    <>
      <TextField
        label="Título"
        value={block.props.title}
        maxLength={80}
        onChange={(title) => onChange({ ...block, props: { ...block.props, title } })}
      />
      {needsAvatar && (
        <ImageField
          label="Foto"
          value={block.props.avatarUrl}
          onChange={(avatarUrl) => onChange({ ...block, props: { ...block.props, avatarUrl } })}
        />
      )}
    </>
  );
}

function HeroForm({ block, onChange }: FormProps<'hero'>) {
  const set = (patch: Partial<BlockOf<'hero'>['props']>) =>
    onChange({ ...block, props: { ...block.props, ...patch } });
  const needsImage =
    block.variant === 'image-right' ||
    block.variant === 'image-left' ||
    block.variant === 'full-bleed';

  return (
    <>
      <TextField
        label="Título"
        value={block.props.heading}
        maxLength={120}
        onChange={(heading) => set({ heading })}
      />
      <TextField
        label="Subtítulo"
        value={block.props.subheading}
        maxLength={240}
        onChange={(subheading) => set({ subheading })}
      />
      {needsImage && (
        <ImageField
          label="Imagem"
          value={block.props.imageUrl}
          onChange={(imageUrl) => set({ imageUrl })}
        />
      )}
      <div className="two-cols">
        <TextField
          label="Texto do botão"
          value={block.props.ctaLabel}
          maxLength={40}
          onChange={(ctaLabel) => set({ ctaLabel })}
        />
        <TextField
          label="Link do botão"
          value={block.props.ctaUrl}
          placeholder="https://"
          onChange={(ctaUrl) => set({ ctaUrl })}
        />
      </div>
    </>
  );
}

function LinksForm({ block, onChange }: FormProps<'links'>) {
  return (
    <ItemList
      items={block.props.items}
      onChange={(items) => onChange({ ...block, props: { items } })}
      itemName="Link"
      max={30}
      addLabel="Adicionar link"
      createItem={(id) => ({ id, label: '', url: '' })}
    >
      {(item, update) => (
        <>
          <TextField
            label="Texto"
            value={item.label}
            maxLength={80}
            onChange={(label) => update({ label })}
          />
          <TextField
            label="URL"
            value={item.url}
            placeholder="https://"
            onChange={(url) => update({ url })}
          />
        </>
      )}
    </ItemList>
  );
}

function SectionTitleField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      label="Título da seção (opcional)"
      value={value}
      maxLength={80}
      onChange={onChange}
    />
  );
}

const NETWORK_OPTIONS = SOCIAL_NETWORKS.map((network) => ({
  value: network,
  label: SOCIAL_LABELS[network],
}));

const COLOR_MODE_OPTIONS = [
  { value: 'brand', label: 'Cores das marcas' },
  { value: 'theme', label: 'Cor do tema' },
  { value: 'custom', label: 'Minha cor' },
] as const;

function normalizeSocialUrl(network: SocialNetwork, value: string) {
  if (network === 'email' && /^[^\s@:/]+@[^\s@]+$/.test(value.trim()))
    return `mailto:${value.trim()}`;
  return value;
}

function SocialForm({ block, onChange }: FormProps<'social'>) {
  const set = (patch: Partial<BlockOf<'social'>['props']>) =>
    onChange({ ...block, props: { ...block.props, ...patch } });

  return (
    <>
      <OptionRow
        label="Cor dos ícones"
        value={block.props.colorMode}
        options={COLOR_MODE_OPTIONS}
        onChange={(colorMode) => set({ colorMode })}
      />
      {block.props.colorMode === 'custom' && (
        <ColorField
          label="Cor dos ícones"
          value={block.props.color ?? '#6366f1'}
          onChange={(color) => set({ color })}
        />
      )}
      <ItemList
        items={block.props.items}
        onChange={(items) => set({ items })}
        itemName="Rede"
        max={20}
        addLabel="Adicionar rede"
        createItem={(id) => ({ id, network: 'instagram' as SocialNetwork, url: '' })}
      >
        {(item, update) => (
          <>
            <SelectField
              label="Rede"
              value={item.network}
              options={NETWORK_OPTIONS}
              onChange={(network) => update({ network: network as SocialNetwork })}
            />
            <TextField
              label="Link"
              value={item.url}
              placeholder={SOCIAL_PLACEHOLDERS[item.network]}
              onChange={(url) => update({ url: normalizeSocialUrl(item.network, url) })}
            />
            <TextField
              label="Nome (opcional)"
              value={item.label}
              maxLength={40}
              hint="Aparece nas aparências com nome."
              onChange={(label) => update({ label })}
            />
          </>
        )}
      </ItemList>
    </>
  );
}

function LinklistForm({ block, onChange }: FormProps<'linklist'>) {
  return (
    <>
      <SectionTitleField
        value={block.props.title}
        onChange={(title) => onChange({ ...block, props: { ...block.props, title } })}
      />
      <ItemList
        items={block.props.items}
        onChange={(items) => onChange({ ...block, props: { ...block.props, items } })}
        itemName="Link"
        max={30}
        addLabel="Adicionar link"
        createItem={(id) => ({ id, label: '', url: '' })}
      >
        {(item, update) => (
          <>
            <TextField
              label="Texto"
              value={item.label}
              maxLength={80}
              onChange={(label) => update({ label })}
            />
            <TextField
              label="URL"
              value={item.url}
              placeholder="https://"
              onChange={(url) => update({ url })}
            />
            <TextField
              label="Descrição (opcional)"
              value={item.description}
              maxLength={160}
              onChange={(description) => update({ description })}
            />
            {block.variant === 'thumbs' && (
              <ImageField
                label="Miniatura"
                value={item.imageUrl}
                onChange={(imageUrl) => update({ imageUrl })}
              />
            )}
          </>
        )}
      </ItemList>
    </>
  );
}

function CarouselForm({ block, onChange }: FormProps<'carousel'>) {
  return (
    <>
      <SectionTitleField
        value={block.props.title}
        onChange={(title) => onChange({ ...block, props: { ...block.props, title } })}
      />
      <ItemList
        items={block.props.items}
        onChange={(items) => onChange({ ...block, props: { ...block.props, items } })}
        itemName="Imagem"
        max={20}
        addLabel="Adicionar imagem"
        createItem={(id) => ({ id, imageUrl: '' })}
      >
        {(item, update) => (
          <>
            <ImageField
              label="Imagem"
              value={item.imageUrl}
              onChange={(imageUrl) => update({ imageUrl })}
            />
            <TextField
              label="Legenda (opcional)"
              value={item.caption}
              maxLength={120}
              onChange={(caption) => update({ caption })}
            />
            <TextField
              label="Link ao clicar (opcional)"
              value={item.linkUrl}
              placeholder="https://"
              onChange={(linkUrl) => update({ linkUrl })}
            />
          </>
        )}
      </ItemList>
    </>
  );
}

function GalleryForm({ block, onChange }: FormProps<'gallery'>) {
  return (
    <>
      <SectionTitleField
        value={block.props.title}
        onChange={(title) => onChange({ ...block, props: { ...block.props, title } })}
      />
      <ItemList
        items={block.props.items}
        onChange={(items) => onChange({ ...block, props: { ...block.props, items } })}
        itemName="Foto"
        max={30}
        addLabel="Adicionar foto"
        createItem={(id) => ({ id, imageUrl: '' })}
      >
        {(item, update) => (
          <>
            <ImageField
              label="Foto"
              value={item.imageUrl}
              onChange={(imageUrl) => update({ imageUrl })}
            />
            <TextField
              label="Descrição da imagem (opcional)"
              value={item.caption}
              maxLength={120}
              hint="Ajuda quem usa leitor de tela."
              onChange={(caption) => update({ caption })}
            />
          </>
        )}
      </ItemList>
    </>
  );
}

function FaqForm({ block, onChange }: FormProps<'faq'>) {
  return (
    <>
      <SectionTitleField
        value={block.props.title}
        onChange={(title) => onChange({ ...block, props: { ...block.props, title } })}
      />
      <ItemList
        items={block.props.items}
        onChange={(items) => onChange({ ...block, props: { ...block.props, items } })}
        itemName="Pergunta"
        max={20}
        addLabel="Adicionar pergunta"
        createItem={(id) => ({ id, question: '', answer: '' })}
      >
        {(item, update) => (
          <>
            <TextField
              label="Pergunta"
              value={item.question}
              maxLength={160}
              onChange={(question) => update({ question })}
            />
            <TextField
              label="Resposta"
              multiline
              value={item.answer}
              maxLength={800}
              onChange={(answer) => update({ answer })}
            />
          </>
        )}
      </ItemList>
    </>
  );
}

function VideoForm({ block, onChange }: FormProps<'video'>) {
  const set = (patch: Partial<BlockOf<'video'>['props']>) =>
    onChange({ ...block, props: { ...block.props, ...patch } });
  const invalid = block.props.url.trim() !== '' && parseVideoUrl(block.props.url) === null;

  return (
    <>
      <TextField
        label="Link do vídeo"
        value={block.props.url}
        placeholder="https://www.youtube.com/watch?v=..."
        hint="Aceita links do YouTube e do Vimeo."
        onChange={(url) => set({ url })}
      />
      {invalid && (
        <p className="error-text" role="alert">
          Este link não parece ser do YouTube nem do Vimeo.
        </p>
      )}
      <TextField
        label="Título (opcional)"
        value={block.props.title}
        maxLength={120}
        onChange={(title) => set({ title })}
      />
    </>
  );
}

function DividerForm() {
  return <p className="hint">Escolha a aparência acima. Este bloco não tem texto.</p>;
}

function TextForm({ block, onChange }: FormProps<'text'>) {
  return (
    <TextField
      label="Conteúdo"
      multiline
      value={block.props.content}
      maxLength={2000}
      onChange={(content) => onChange({ ...block, props: { content } })}
    />
  );
}

function FooterForm({ block, onChange }: FormProps<'footer'>) {
  return (
    <TextField
      label="Texto"
      value={block.props.text}
      maxLength={200}
      onChange={(text) => onChange({ ...block, props: { text } })}
    />
  );
}

function BlockFields({
  block,
  theme,
  onChange,
}: {
  block: Block;
  theme: Theme;
  onChange: (block: Block) => void;
}) {
  const picker = (
    <VariantPicker
      type={block.type}
      value={block.variant}
      theme={theme}
      onChange={(variant) => onChange({ ...block, variant } as Block)}
    />
  );

  switch (block.type) {
    case 'header':
      return (
        <>
          {picker}
          <HeaderForm block={block} onChange={onChange} />
        </>
      );
    case 'hero':
      return (
        <>
          {picker}
          <HeroForm block={block} onChange={onChange} />
        </>
      );
    case 'links':
      return (
        <>
          {picker}
          <LinksForm block={block} onChange={onChange} />
        </>
      );
    case 'text':
      return (
        <>
          {picker}
          <TextForm block={block} onChange={onChange} />
        </>
      );
    case 'footer':
      return (
        <>
          {picker}
          <FooterForm block={block} onChange={onChange} />
        </>
      );
    case 'social':
      return (
        <>
          {picker}
          <SocialForm block={block} onChange={onChange} />
        </>
      );
    case 'linklist':
      return (
        <>
          {picker}
          <LinklistForm block={block} onChange={onChange} />
        </>
      );
    case 'carousel':
      return (
        <>
          {picker}
          <CarouselForm block={block} onChange={onChange} />
        </>
      );
    case 'gallery':
      return (
        <>
          {picker}
          <GalleryForm block={block} onChange={onChange} />
        </>
      );
    case 'faq':
      return (
        <>
          {picker}
          <FaqForm block={block} onChange={onChange} />
        </>
      );
    case 'video':
      return (
        <>
          {picker}
          <VideoForm block={block} onChange={onChange} />
        </>
      );
    case 'divider':
      return (
        <>
          {picker}
          <DividerForm />
        </>
      );
  }
}

const ANIMATION_OPTIONS = ANIMATION_TYPES.map((type) => ({
  value: type,
  label: ANIMATION_LABELS[type],
}));

export function BlockForm({
  block,
  theme,
  onChange,
}: {
  block: Block;
  theme: Theme;
  onChange: (block: Block) => void;
}) {
  const setAnimation = (value: string) => {
    const { animation: _previous, ...rest } = block;
    onChange((value === 'none' ? rest : { ...rest, animation: value }) as Block);
  };

  return (
    <>
      <BlockFields block={block} theme={theme} onChange={onChange} />
      <SelectField
        label="Animação ao rolar a página"
        value={block.animation ?? 'none'}
        options={ANIMATION_OPTIONS}
        onChange={setAnimation}
      />
      <p className="hint">O bloco aparece com esse efeito quando entra na tela.</p>
    </>
  );
}
