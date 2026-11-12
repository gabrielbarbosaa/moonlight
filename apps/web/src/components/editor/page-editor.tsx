'use client';

import { PageRenderer } from '@moonlight/renderer';
import { CarouselControls } from '@/components/carousel-controls';
import { ScrollAnimations } from '@/components/scroll-animations';
import type { PageContent } from '@moonlight/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROOT_DOMAIN } from '@/components/create-tenant-form';
import { Icon } from '@/components/icons';
import { billingApi, getErrorMessage, pagesApi, tenantsApi, type PageState } from '@/lib/api';
import { validatePage } from '@/lib/page-editor';
import { BlocksPanel } from './blocks-panel';
import { ThemePanel } from './theme-panel';

type Tab = 'blocks' | 'theme';
type Device = 'mobile' | 'desktop';

function snapshotOf(page: PageContent) {
  const result = validatePage(page);
  return JSON.stringify(result.valid ? result.page : page);
}

export function PageEditor({ initial }: { initial: PageState }) {
  const [page, setPage] = useState<PageContent>(initial.draft);
  const [server, setServer] = useState<PageState>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotOf(initial.draft));
  const [tab, setTab] = useState<Tab>('blocks');
  const [device, setDevice] = useState<Device>('mobile');

  const billing = useQuery({ queryKey: ['billing'], queryFn: billingApi.me });
  const tenants = useQuery({ queryKey: ['tenants'], queryFn: tenantsApi.listMine });
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
  const canSave = validation.valid && dirty && !busy;
  const canPublish = validation.valid && (dirty || server.hasUnpublishedChanges) && !busy;

  const doSave = useCallback(() => {
    if (validation.valid && dirty && !busy) save.mutate(validation.page);
  }, [validation, dirty, busy, save]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        doSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doSave]);

  const status = !validation.valid
    ? { text: 'Corrija os erros para salvar', tone: 'badge-danger' }
    : dirty
      ? { text: 'Alterações não salvas', tone: 'badge-warning' }
      : server.hasUnpublishedChanges
        ? { text: 'Rascunho salvo, não publicado', tone: 'badge' }
        : { text: 'Tudo publicado', tone: 'badge-success' };

  const slug = tenants.data?.[0]?.slug;
  const protocol = typeof window === 'undefined' ? 'http:' : window.location.protocol;
  const publicUrl = slug ? `${protocol}//${slug}.${ROOT_DOMAIN}` : null;

  return (
    <>
      <div className="editor-bar">
        <div className="editor-bar-inner">
          <div className="row" style={{ flex: 1, minWidth: 220 }}>
            <strong style={{ fontSize: '1.05rem' }}>Editor</strong>
            <span className={`badge ${status.tone}`} aria-live="polite">
              {status.text}
            </span>
          </div>
          {publicUrl && server.published && (
            <a className="btn" href={publicUrl} target="_blank" rel="noreferrer">
              <Icon name="external" />
              Ver página
            </a>
          )}
          <button type="button" className="btn" onClick={doSave} disabled={!canSave}>
            {save.isPending ? 'Salvando...' : 'Salvar rascunho'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => validation.valid && publish.mutate(validation.page)}
            disabled={!canPublish}
          >
            {publish.isPending ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <section className="editor-side">
          {error && <p role="alert">{getErrorMessage(error)}</p>}
          {!validation.valid && (
            <div role="alert" style={{ marginBottom: 16 }}>
              <ul style={{ margin: 0 }}>
                {validation.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="editor-tabs" role="tablist" aria-label="Seções do editor">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'blocks'}
              onClick={() => setTab('blocks')}
            >
              <Icon name="blocks" />
              Blocos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'theme'}
              onClick={() => setTab('theme')}
            >
              <Icon name="palette" />
              Tema
            </button>
          </div>

          {tab === 'blocks' ? (
            <BlocksPanel page={page} maxBlocks={maxBlocks} onChange={setPage} />
          ) : (
            <ThemePanel theme={page.theme} onChange={(theme) => setPage({ ...page, theme })} />
          )}
        </section>

        <section className="editor-preview">
          <div className="preview-toolbar">
            <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Pré-visualização
            </span>
            <div className="segmented" role="group" aria-label="Tamanho da tela">
              <button
                type="button"
                aria-pressed={device === 'mobile'}
                onClick={() => setDevice('mobile')}
              >
                <Icon name="phone" />
                Celular
              </button>
              <button
                type="button"
                aria-pressed={device === 'desktop'}
                onClick={() => setDevice('desktop')}
              >
                <Icon name="monitor" />
                Computador
              </button>
            </div>
          </div>
          <div className="preview-stage">
            <div className="preview-frame" data-device={device}>
              <PageRenderer content={lastValid.current} fill="container" />
              <CarouselControls />
              <ScrollAnimations />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
