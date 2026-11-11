'use client';

import type { Entitlements, PlanDefinition } from '@sitebuilder/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { billingApi, getErrorMessage } from '@/lib/api';

const mainStyle = { maxWidth: 820, margin: '48px auto', padding: '0 16px' } as const;
const errorStyle = { color: '#b00020' } as const;
const cellStyle = {
  padding: '8px 10px',
  borderBottom: '1px solid #eee',
  textAlign: 'left',
} as const;

function formatPrice(cents: number) {
  return cents === 0 ? 'Grátis' : `R$ ${(cents / 100).toFixed(2).replace('.', ',')} / mês`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR');
}

function limits(entitlements: Entitlements) {
  return [
    `Até ${entitlements.maxBlocks} blocos na página`,
    entitlements.booking
      ? `Agenda com até ${entitlements.maxBookingServices} serviços`
      : 'Sem agenda de reservas',
    `Analytics dos últimos ${entitlements.analyticsDays} dias`,
  ];
}

function Notice() {
  const params = useSearchParams();
  const checkout = params.get('checkout');

  if (checkout === 'success') {
    return (
      <p
        role="status"
        style={{ border: '1px solid #1b7a3a', color: '#1b7a3a', padding: 12, borderRadius: 8 }}
      >
        Pagamento aprovado. Seu plano foi atualizado.
      </p>
    );
  }
  if (checkout === 'declined') {
    return (
      <p
        role="alert"
        style={{ border: '1px solid #b00020', color: '#b00020', padding: 12, borderRadius: 8 }}
      >
        Pagamento recusado. Nenhuma cobrança foi feita e seu plano não mudou.
      </p>
    );
  }
  if (checkout === 'cancelled') {
    return <p role="status">Checkout cancelado. Nada foi cobrado.</p>;
  }
  return null;
}

function PlanCard({
  plan,
  current,
  onUpgrade,
  upgrading,
}: {
  plan: PlanDefinition;
  current: boolean;
  onUpgrade: () => void;
  upgrading: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 240,
        border: current ? '2px solid #4f46e5' : '1px solid #ddd',
        borderRadius: 8,
        padding: 16,
      }}
    >
      <h2 style={{ margin: '0 0 4px' }}>{plan.name}</h2>
      <p style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>
        {formatPrice(plan.priceCents)}
      </p>
      <ul style={{ paddingLeft: 18 }}>
        {limits(plan.entitlements).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {current ? (
        <p style={{ fontWeight: 600 }}>Plano atual</p>
      ) : plan.priceCents > 0 ? (
        <button type="button" onClick={onUpgrade} disabled={upgrading}>
          {upgrading ? 'Abrindo checkout...' : `Assinar ${plan.name}`}
        </button>
      ) : null}
    </div>
  );
}

function BillingContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const billing = useQuery({ queryKey: ['billing'], queryFn: billingApi.me });

  const checkout = useMutation({
    mutationFn: billingApi.checkout,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
  const cancel = useMutation({
    mutationFn: billingApi.cancel,
    onSuccess: (data) => queryClient.setQueryData(['billing'], data),
  });
  const resume = useMutation({
    mutationFn: billingApi.resume,
    onSuccess: (data) => queryClient.setQueryData(['billing'], data),
  });

  const status = isAxiosError(billing.error) ? billing.error.response?.status : undefined;

  useEffect(() => {
    if (status === 401) router.replace('/admin/login');
  }, [status, router]);

  if (billing.isPending || status === 401) {
    return <p>Carregando...</p>;
  }
  if (billing.isError) {
    return <p style={errorStyle}>{getErrorMessage(billing.error)}</p>;
  }

  const state = billing.data;
  const currentPlan = state.plans.find((plan) => plan.id === state.plan);
  const actionError = checkout.error ?? cancel.error ?? resume.error;

  return (
    <>
      <Notice />

      <p>
        Plano atual: <strong>{currentPlan?.name}</strong>
        {state.plan !== 'FREE' && state.currentPeriodEnd && (
          <>
            {' '}
            ·{' '}
            {state.cancelAtPeriodEnd
              ? `cancela em ${formatDate(state.currentPeriodEnd)}`
              : `renova em ${formatDate(state.currentPeriodEnd)}`}
          </>
        )}
      </p>

      {actionError && <p style={errorStyle}>{getErrorMessage(actionError)}</p>}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '16px 0' }}>
        {state.plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={plan.id === state.plan}
            onUpgrade={() => checkout.mutate()}
            upgrading={checkout.isPending}
          />
        ))}
      </div>

      {state.plan !== 'FREE' && (
        <p>
          {state.cancelAtPeriodEnd ? (
            <button type="button" onClick={() => resume.mutate()} disabled={resume.isPending}>
              Manter minha assinatura
            </button>
          ) : (
            <button type="button" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              Cancelar ao fim do período
            </button>
          )}
        </p>
      )}

      <h2 style={{ fontSize: 18 }}>Comparação</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={cellStyle}>Recurso</th>
            {state.plans.map((plan) => (
              <th key={plan.id} style={cellStyle}>
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cellStyle}>Blocos por página</td>
            {state.plans.map((plan) => (
              <td key={plan.id} style={cellStyle}>
                {plan.entitlements.maxBlocks}
              </td>
            ))}
          </tr>
          <tr>
            <td style={cellStyle}>Agenda de reservas</td>
            {state.plans.map((plan) => (
              <td key={plan.id} style={cellStyle}>
                {plan.entitlements.booking
                  ? `Sim (${plan.entitlements.maxBookingServices} serviços)`
                  : 'Não'}
              </td>
            ))}
          </tr>
          <tr>
            <td style={cellStyle}>Histórico de analytics</td>
            {state.plans.map((plan) => (
              <td key={plan.id} style={cellStyle}>
                {plan.entitlements.analyticsDays} dias
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p style={{ fontSize: 13, color: '#555' }}>
        Ambiente de teste: o pagamento é simulado e nenhum valor real é cobrado.
      </p>
    </>
  );
}

export default function BillingPage() {
  return (
    <main style={mainStyle}>
      <p>
        <Link href="/admin">← Painel</Link>
      </p>
      <h1>Plano</h1>
      <Suspense fallback={<p>Carregando...</p>}>
        <BillingContent />
      </Suspense>
    </main>
  );
}
