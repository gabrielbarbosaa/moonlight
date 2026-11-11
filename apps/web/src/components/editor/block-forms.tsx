'use client';

import type { Block, Theme } from '@moonlight/schemas';
import { Icon } from '@/components/icons';
import { moveItem, newId } from '@/lib/page-editor';
import { TextField } from './fields';
import { ImageField } from './image-field';
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
  const items = block.props.items;
  const setItems = (next: typeof items) => onChange({ ...block, props: { items: next } });

  return (
    <>
      {items.map((item, index) => (
        <div
          key={item.id}
          style={{
            marginTop: 12,
            padding: '4px 12px 12px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <strong style={{ fontSize: '0.85rem' }}>Link {index + 1}</strong>
            <span className="block-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Subir link ${index + 1}`}
                disabled={index === 0}
                onClick={() => setItems(moveItem(items, index, index - 1))}
              >
                <Icon name="up" />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Descer link ${index + 1}`}
                disabled={index === items.length - 1}
                onClick={() => setItems(moveItem(items, index, index + 1))}
              >
                <Icon name="down" />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remover link ${index + 1}`}
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                <Icon name="trash" />
              </button>
            </span>
          </div>
          <TextField
            label="Texto"
            value={item.label}
            maxLength={80}
            onChange={(label) =>
              setItems(items.map((it, i) => (i === index ? { ...it, label } : it)))
            }
          />
          <TextField
            label="URL"
            value={item.url}
            placeholder="https://"
            onChange={(url) => setItems(items.map((it, i) => (i === index ? { ...it, url } : it)))}
          />
        </div>
      ))}
      <button
        type="button"
        disabled={items.length >= 30}
        style={{ marginTop: 12 }}
        onClick={() => setItems([...items, { id: newId(), label: '', url: '' }])}
      >
        <Icon name="plus" />
        Adicionar link
      </button>
    </>
  );
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

export function BlockForm({
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
  }
}
