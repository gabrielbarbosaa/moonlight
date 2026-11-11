'use client';

import { useEffect, useRef, useState } from 'react';
import type { MediaAssetDto } from '@moonlight/schemas';
import { ACCEPTED_IMAGE_TYPES } from '@moonlight/schemas';
import { getErrorMessage, mediaApi } from '../../lib/api';

export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const asset = await mediaApi.upload(file);
      onChange(asset.url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="field" role="group" aria-label={label}>
      <span style={{ fontSize: '0.9rem', fontWeight: 550 }}>{label}</span>
      <div className="image-field">
        <div className="image-field-thumb" aria-hidden="true">
          {value ? <img src={value} alt="" /> : <span>Sem imagem</span>}
        </div>
        <div className="image-field-actions">
          <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? 'Enviando...' : 'Enviar imagem'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setLibraryOpen(true)}>
            Biblioteca
          </button>
          {value && (
            <button type="button" className="btn-ghost btn-danger" onClick={() => onChange('')}>
              Remover
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          hidden
          style={{ display: 'none' }}
          tabIndex={-1}
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          data-testid="image-upload-input"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <p className="hint">{hint ?? 'JPG, PNG, WebP ou GIF, até 5 MB.'}</p>
      <details className="image-field-url">
        <summary>Usar o endereço de uma imagem da internet</summary>
        <input
          value={value ?? ''}
          placeholder="https://"
          aria-label={`${label} (endereço)`}
          onChange={(event) => onChange(event.target.value)}
        />
      </details>
      {libraryOpen && (
        <ImageLibrary
          current={value}
          onClose={() => setLibraryOpen(false)}
          onPick={(url) => {
            onChange(url);
            setLibraryOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ImageLibrary({
  current,
  onClose,
  onPick,
}: {
  current: string | undefined;
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const [items, setItems] = useState<MediaAssetDto[] | null>(null);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    mediaApi
      .list()
      .then((library) => {
        if (!active) return;
        setItems(library.items);
        setUsed(library.used);
        setLimit(library.limit);
      })
      .catch((err) => active && setError(getErrorMessage(err)));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function remove(asset: MediaAssetDto) {
    setError(null);
    try {
      await mediaApi.remove(asset.id);
      setItems((previous) => previous?.filter((item) => item.id !== asset.id) ?? null);
      setUsed((previous) => Math.max(0, previous - 1));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Biblioteca de imagens"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Biblioteca de imagens</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        {limit > 0 && (
          <p className="hint">
            {used} de {limit} imagens usadas no seu plano.
          </p>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {items === null && !error && <p className="hint">Carregando...</p>}
        {items && items.length === 0 && (
          <p className="empty">Você ainda não enviou nenhuma imagem.</p>
        )}
        {items && items.length > 0 && (
          <ul className="media-grid">
            {items.map((asset) => (
              <li key={asset.id} className="media-item" data-selected={asset.url === current}>
                <button
                  type="button"
                  className="media-pick"
                  onClick={() => onPick(asset.url)}
                  aria-label={`Usar imagem ${asset.width} por ${asset.height}`}
                >
                  <img src={asset.url} alt="" loading="lazy" />
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-danger media-delete"
                  onClick={() => void remove(asset)}
                  aria-label="Apagar imagem"
                >
                  Apagar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
