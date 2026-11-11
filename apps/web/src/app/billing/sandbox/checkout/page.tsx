'use client';

import type { SandboxSessionInfo } from '@sitebuilder/schemas';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const mainStyle = { maxWidth: 460, margin: '64px auto', padding: '0 16px' } as const;

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

  if (state === 'loading') return <p>Carregando...</p>;

  if (state === 'invalid') {
    return (
      <>
        <h1>Checkout indisponível</h1>
        <p>Esta sessão de pagamento expirou ou já foi usada.</p>
        <p>
          <a href="/admin/billing">Voltar para os planos</a>
        </p>
      </>
    );
  }

  if (state === 'error' || !info) {
    return <p style={{ color: '#b00020' }}>Não foi possível falar com o servidor.</p>;
  }

  return (
    <>
      <p style={{ background: '#fff4cc', padding: 8, borderRadius: 6, fontSize: 13 }}>
        Ambiente de teste (sandbox). Nenhum pagamento real é feito.
      </p>
      <h1>Assinar {info.planName}</h1>
      <p style={{ fontSize: 22, fontWeight: 700 }}>
        R$ {(info.priceCents / 100).toFixed(2).replace('.', ',')} / mês
      </p>
      <p>
        <button
          type="button"
          disabled={state === 'sending'}
          onClick={() => complete('success')}
          style={{ padding: 10, width: '100%' }}
        >
          Pagar com cartão de teste (aprovado)
        </button>
      </p>
      <p>
        <button
          type="button"
          disabled={state === 'sending'}
          onClick={() => complete('declined')}
          style={{ padding: 10, width: '100%' }}
        >
          Simular cartão recusado
        </button>
      </p>
      <p>
        <a href="/admin/billing?checkout=cancelled">Cancelar e voltar</a>
      </p>
    </>
  );
}

export default function SandboxCheckoutPage() {
  return (
    <main style={mainStyle}>
      <Suspense fallback={<p>Carregando...</p>}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}
