'use client';

import { REPORT_REASONS, REPORT_REASON_LABELS } from '@sitebuilder/schemas';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

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
    <main style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px' }}>
      <h1>Denunciar página</h1>

      {status === 'sent' ? (
        <p>Obrigado. Nossa equipe vai analisar a denúncia.</p>
      ) : (
        <form onSubmit={submit}>
          <label style={{ display: 'block' }}>
            Motivo
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as (typeof REPORT_REASONS)[number])}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            >
              {REPORT_REASONS.map((value) => (
                <option key={value} value={value}>
                  {REPORT_REASON_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'block', marginTop: 12 }}>
            Detalhes (opcional)
            <textarea
              rows={4}
              maxLength={500}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              style={{
                display: 'block',
                width: '100%',
                padding: 8,
                marginTop: 4,
                boxSizing: 'border-box',
              }}
            />
          </label>

          {status === 'error' && (
            <p style={{ color: '#b00020' }}>Não foi possível enviar. Tente de novo.</p>
          )}
          {status === 'limited' && (
            <p style={{ color: '#b00020' }}>Muitas denúncias em pouco tempo. Tente mais tarde.</p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            style={{ marginTop: 16, padding: 10 }}
          >
            {status === 'sending' ? 'Enviando...' : 'Enviar denúncia'}
          </button>
        </form>
      )}
    </main>
  );
}
