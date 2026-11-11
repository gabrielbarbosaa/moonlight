'use client';

import type { Block } from '@sitebuilder/schemas';
import { VARIANTS, moveItem, newId } from '@/lib/page-editor';
import { SelectField, TextField } from './fields';

type BlockOf<T extends Block['type']> = Extract<Block, { type: T }>;

type FormProps<T extends Block['type']> = {
  block: BlockOf<T>;
  onChange: (block: BlockOf<T>) => void;
};

function HeaderForm({ block, onChange }: FormProps<'header'>) {
  return (
    <>
      <TextField
        label="Título"
        value={block.props.title}
        maxLength={80}
        onChange={(title) => onChange({ ...block, props: { ...block.props, title } })}
      />
      {block.variant === 'with-avatar' && (
        <TextField
          label="URL da foto"
          value={block.props.avatarUrl}
          placeholder="https://"
          onChange={(avatarUrl) => onChange({ ...block, props: { ...block.props, avatarUrl } })}
        />
      )}
    </>
  );
}

function HeroForm({ block, onChange }: FormProps<'hero'>) {
  const set = (patch: Partial<BlockOf<'hero'>['props']>) =>
    onChange({ ...block, props: { ...block.props, ...patch } });

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
      {block.variant !== 'text' && (
        <TextField
          label="URL da imagem"
          value={block.props.imageUrl}
          placeholder="https://"
          onChange={(imageUrl) => set({ imageUrl })}
        />
      )}
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
    </>
  );
}

function LinksForm({ block, onChange }: FormProps<'links'>) {
  const items = block.props.items;
  const setItems = (next: typeof items) => onChange({ ...block, props: { items: next } });

  return (
    <>
      {items.map((item, index) => (
        <fieldset
          key={item.id}
          style={{ marginTop: 10, border: '1px solid #ddd', borderRadius: 6 }}
        >
          <legend style={{ fontSize: 12 }}>Link {index + 1}</legend>
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
          <p style={{ margin: '8px 0 4px' }}>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setItems(moveItem(items, index, index - 1))}
            >
              ↑
            </button>{' '}
            <button
              type="button"
              disabled={index === items.length - 1}
              onClick={() => setItems(moveItem(items, index, index + 1))}
            >
              ↓
            </button>{' '}
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))}>
              Remover
            </button>
          </p>
        </fieldset>
      ))}
      <p>
        <button
          type="button"
          disabled={items.length >= 30}
          onClick={() => setItems([...items, { id: newId(), label: '', url: '' }])}
        >
          Adicionar link
        </button>
      </p>
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

export function BlockForm({ block, onChange }: { block: Block; onChange: (block: Block) => void }) {
  const variantField = (
    <SelectField
      label="Estilo"
      value={block.variant}
      options={VARIANTS[block.type]}
      onChange={(variant) => onChange({ ...block, variant } as Block)}
    />
  );

  switch (block.type) {
    case 'header':
      return (
        <>
          {variantField}
          <HeaderForm block={block} onChange={onChange} />
        </>
      );
    case 'hero':
      return (
        <>
          {variantField}
          <HeroForm block={block} onChange={onChange} />
        </>
      );
    case 'links':
      return (
        <>
          {variantField}
          <LinksForm block={block} onChange={onChange} />
        </>
      );
    case 'text':
      return (
        <>
          {variantField}
          <TextForm block={block} onChange={onChange} />
        </>
      );
    case 'footer':
      return (
        <>
          {variantField}
          <FooterForm block={block} onChange={onChange} />
        </>
      );
  }
}
