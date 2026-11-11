'use client';

import { REPORT_REASONS, REPORT_REASON_LABELS } from '@moonlight/schemas';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'limited';

export default function ReportPage() {
  const params = useParams<{ tenant: string }>();
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>('spam');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('sending');
    try {
      const response = await fetch(
        `${API_URL}/tenants/public/${encodeURIComponent(params.tenant)}/report`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason, details: details.trim() || undefined }),
        },
      );
      if (response.status === 429) setStatus('limited');
      else setStatus(response.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <main className="page page-narrow">
      {status === 'sent' ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <span
            className="icon-tile"
            style={{
              width: 56,
              height: 56,
              color: 'var(--success)',
              background: 'var(--success-soft)',
              borderRadius: 999,
            }}
          >
            <Icon name="check" style={{ width: 26, height: 26 }} />
          </span>
          <h1 style={{ margin: '16px 0 8px' }}>Denúncia enviada</h1>
          <p className="muted" style={{ margin: 0 }}>
            Obrigado. Nossa equipe vai analisar a denúncia.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="card">
          <h1 style={{ fontSize: '1.5rem' }}>Denunciar página</h1>
          <p className="muted">
            Conte o que está errado. Sua denúncia é anônima e ajuda a manter a plataforma segura.
          </p>

          <label className="field">
            Motivo
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as (typeof REPORT_REASONS)[number])}
            >
              {REPORT_REASONS.map((value) => (
                <option key={value} value={value}>
                  {REPORT_REASON_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Detalhes (opcional)
            <textarea
              rows={4}
              maxLength={500}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>

          {status === 'error' && (
            <p className="error-text">Não foi possível enviar. Tente de novo.</p>
          )}
          {status === 'limited' && (
            <p className="error-text">Muitas denúncias em pouco tempo. Tente mais tarde.</p>
          )}

          <button
            type="submit"
            className="btn-lg"
            disabled={status === 'sending'}
            style={{ width: '100%', marginTop: 18 }}
          >
            {status === 'sending' ? 'Enviando...' : 'Enviar denúncia'}
          </button>
        </form>
      )}
    </main>
  );
}
