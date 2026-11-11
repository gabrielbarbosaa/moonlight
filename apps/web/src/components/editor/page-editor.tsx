'use client';

import { PageRenderer } from '@sitebuilder/renderer';
import type { Block, BlockType, PageContent } from '@sitebuilder/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { billingApi, getErrorMessage, pagesApi, type PageState } from '@/lib/api';
import { BLOCK_LABELS, createBlock, moveItem, validatePage } from '@/lib/page-editor';
import { BlockForm } from './block-forms';
import { ColorField, SelectField } from './fields';

const BLOCK_TYPES = Object.keys(BLOCK_LABELS) as BlockType[];

function snapshotOf(page: PageContent) {
  const result = validatePage(page);
  return JSON.stringify(result.valid ? result.page : page);
}

export function PageEditor({ initial }: { initial: PageState }) {
  const [page, setPage] = useState<PageContent>(initial.draft);
  const [server, setServer] = useState<PageState>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotOf(initial.draft));
  const [newType, setNewType] = useState<BlockType>('text');

  const billing = useQuery({ queryKey: ['billing'], queryFn: billingApi.me });
  const maxBlocks = billing.data?.entitlements.maxBlocks ?? 50;

  const validation = useMemo(() => validatePage(page), [page]);
  const currentSnapshot = useMemo(() => snapshotOf(page), [page]);
  const dirty = currentSnapshot !== savedSnapshot;

  const lastValid = useRef<PageContent>(initial.draft);
  if (validation.valid) lastValid.current = validation.page;

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async (content: PageContent) => ({
      content,
      state: await pagesApi.saveDraft(content),
    }),
    onSuccess: ({ content, state }) => {
      setServer(state);
      setSavedSnapshot(JSON.stringify(content));
    },
  });

  const publish = useMutation({
    mutationFn: async (content: PageContent) => {
      if (dirty) await pagesApi.saveDraft(content);
      return { content, state: await pagesApi.publish() };
    },
    onSuccess: ({ content, state }) => {
      setServer(state);
      setSavedSnapshot(JSON.stringify(content));
    },
  });

  const busy = save.isPending || publish.isPending;
  const error = save.error ?? publish.error;

  const updateBlock = (index: number, block: Block) =>
    setPage((current) => ({
      ...current,
      blocks: current.blocks.map((b, i) => (i === index ? block : b)),
    }));

  const status = !validation.valid
    ? 'Corrija os erros para salvar.'
    : dirty
      ? 'Alterações não salvas.'
      : server.hasUnpublishedChanges
        ? 'Rascunho salvo, com alterações ainda não publicadas.'
        : 'Tudo publicado.';

  return (
    <div style={{ padding: '16px 24px' }}>
      <header style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href="/admin">← Painel</Link>
        <h1 style={{ margin: 0, fontSize: 22 }}>Editor</h1>
        <span role="status" style={{ flex: 1, color: '#555' }}>
          {status}
        </span>
        <button
          type="button"
          disabled={busy || !validation.valid || !dirty}
          onClick={() => validation.valid && save.mutate(validation.page)}
        >
          {save.isPending ? 'Salvando...' : 'Salvar rascunho'}
        </button>
        <button
          type="button"
          disabled={busy || !validation.valid || (!dirty && !server.hasUnpublishedChanges)}
          onClick={() => validation.valid && publish.mutate(validation.page)}
        >
          {publish.isPending ? 'Publicando...' : 'Publicar'}
        </button>
      </header>

      {error && <p style={{ color: '#b00020' }}>{getErrorMessage(error)}</p>}
      {!validation.valid && (
        <ul style={{ color: '#b00020', fontSize: 14 }}>
          {validation.errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 24,
          marginTop: 16,
          alignItems: 'start',
        }}
      >
        <section>
          <fieldset style={{ border: '1px solid #ddd', borderRadius: 8 }}>
            <legend>Tema</legend>
            <ColorField
              label="Cor principal"
              value={page.theme.primaryColor}
              onChange={(primaryColor) =>
                setPage({ ...page, theme: { ...page.theme, primaryColor } })
              }
            />
            <ColorField
              label="Fundo"
              value={page.theme.background}
              onChange={(background) => setPage({ ...page, theme: { ...page.theme, background } })}
            />
            <SelectField
              label="Fonte"
              value={page.theme.font}
              options={[
                { value: 'sans', label: 'Sem serifa' },
                { value: 'serif', label: 'Serifada' },
                { value: 'mono', label: 'Monoespaçada' },
              ]}
              onChange={(font) =>
                setPage({
                  ...page,
                  theme: { ...page.theme, font: font as PageContent['theme']['font'] },
                })
              }
            />
          </fieldset>

          {page.blocks.map((block, index) => (
            <fieldset
              key={block.id}
              style={{ border: '1px solid #ddd', borderRadius: 8, marginTop: 12 }}
            >
              <legend>
                {BLOCK_LABELS[block.type]} {index + 1}
              </legend>
              <BlockForm block={block} onChange={(next) => updateBlock(index, next)} />
              <p style={{ margin: '12px 0 4px' }}>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    setPage({ ...page, blocks: moveItem(page.blocks, index, index - 1) })
                  }
                >
                  Subir
                </button>{' '}
                <button
                  type="button"
                  disabled={index === page.blocks.length - 1}
                  onClick={() =>
                    setPage({ ...page, blocks: moveItem(page.blocks, index, index + 1) })
                  }
                >
                  Descer
                </button>{' '}
                <button
                  type="button"
                  onClick={() =>
                    setPage({ ...page, blocks: page.blocks.filter((_, i) => i !== index) })
                  }
                >
                  Remover bloco
                </button>
              </p>
            </fieldset>
          ))}

          <p style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <select
              value={newType}
              onChange={(event) => setNewType(event.target.value as BlockType)}
            >
              {BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BLOCK_LABELS[type]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={page.blocks.length >= maxBlocks}
              onClick={() => setPage({ ...page, blocks: [...page.blocks, createBlock(newType)] })}
            >
              Adicionar bloco
            </button>
            <span style={{ alignSelf: 'center', fontSize: 13, color: '#555' }}>
              {page.blocks.length} de {maxBlocks} blocos
              {page.blocks.length >= maxBlocks && (
                <>
                  {' '}
                  · <Link href="/admin/billing">Ver planos</Link>
                </>
              )}
            </span>
          </p>
        </section>

        <section style={{ position: 'sticky', top: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>Pré-visualização</p>
          <div
            style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'auto', height: '75vh' }}
          >
            <PageRenderer content={lastValid.current} />
          </div>
        </section>
      </div>
    </div>
  );
}
