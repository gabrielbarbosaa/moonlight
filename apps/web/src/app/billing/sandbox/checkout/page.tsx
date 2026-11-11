'use client';

import type { SandboxSessionInfo } from '@sitebuilder/schemas';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Brand } from '@/components/brand';
import { Icon } from '@/components/icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function CheckoutContent() {
  const router = useRouter();
  const sessionId = useSearchParams().get('session');
  const [info, setInfo] = useState<SandboxSessionInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'sending' | 'error'>(
    'loading',
  );

  useEffect(() => {
    if (!sessionId) {
      setState('invalid');
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/billing/sandbox/sessions/${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) return setState('invalid');
        setInfo(await response.json());
        setState('ready');
      })
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const complete = async (outcome: 'success' | 'declined') => {
    setState('sending');
    try {
      const response = await fetch(
        `${API_URL}/billing/sandbox/sessions/${encodeURIComponent(sessionId ?? '')}/complete`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ outcome }),
        },
      );
      if (!response.ok) return setState('invalid');
      router.replace(`/admin/billing?checkout=${outcome === 'success' ? 'success' : 'declined'}`);
    } catch {
      setState('error');
    }
  };

  if (state === 'loading') return <p className="muted">Carregando...</p>;

  if (state === 'invalid') {
    return (
      <>
        <h1 style={{ fontSize: '1.5rem' }}>Checkout indisponível</h1>
        <p className="muted">Esta sessão de pagamento expirou ou já foi usada.</p>
        <a className="btn btn-primary" href="/admin/billing">
          Voltar para os planos
        </a>
      </>
    );
  }

  if (state === 'error' || !info) {
    return <p role="alert">Não foi possível falar com o servidor.</p>;
  }

  return (
    <>
      <p className="badge badge-warning" style={{ marginBottom: 16 }}>
        Ambiente de teste · nenhum pagamento real
      </p>
      <h1 style={{ fontSize: '1.5rem' }}>Assinar {info.planName}</h1>
      <p style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 4px' }}>
        R$ {(info.priceCents / 100).toFixed(2).replace('.', ',')}
        <small className="muted" style={{ fontSize: '0.95rem', fontWeight: 500 }}>
          {' '}
          / mês
        </small>
      </p>
      <p className="muted">Escolha como simular o pagamento deste checkout de teste.</p>

      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={state === 'sending'}
        onClick={() => complete('success')}
        style={{ width: '100%' }}
      >
        <Icon name="check" />
        Pagar com cartão de teste (aprovado)
      </button>
      <button
        type="button"
        className="btn-lg"
        disabled={state === 'sending'}
        onClick={() => complete('declined')}
        style={{ width: '100%', marginTop: 10 }}
      >
        Simular cartão recusado
      </button>
      <p style={{ textAlign: 'center', margin: '18px 0 0' }}>
        <a href="/admin/billing?checkout=cancelled">Cancelar e voltar</a>
      </p>
    </>
  );
}

export default function SandboxCheckoutPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ marginBottom: 22 }}>
          <Brand />
        </div>
        <Suspense fallback={<p className="muted">Carregando...</p>}>
          <CheckoutContent />
        </Suspense>
      </div>
    </div>
  );
}
