'use client';

import type { Entitlements, PlanDefinition } from '@sitebuilder/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Icon } from '@/components/icons';
import { billingApi, getErrorMessage } from '@/lib/api';

function formatPrice(cents: number) {
  return cents === 0 ? 'R$ 0' : `R$ ${(cents / 100).toFixed(0)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR');
}

function features(entitlements: Entitlements) {
  return [
    { text: `Até ${entitlements.maxBlocks} blocos por página`, on: true },
    { text: 'Todos os temas e estilos', on: true },
    {
      text: entitlements.booking
        ? `Agenda com até ${entitlements.maxBookingServices} serviços`
        : 'Agenda de reservas',
      on: entitlements.booking,
    },
    { text: `Estatísticas dos últimos ${entitlements.analyticsDays} dias`, on: true },
  ];
}

function Notice() {
  const checkout = useSearchParams().get('checkout');

  if (checkout === 'success') {
    return <p role="status">Pagamento aprovado. Seu plano foi atualizado.</p>;
  }
  if (checkout === 'declined') {
    return (
      <p role="alert">Pagamento recusado. Nenhuma cobrança foi feita e seu plano não mudou.</p>
    );
  }
  if (checkout === 'cancelled') {
    return <p className="muted">Checkout cancelado. Nada foi cobrado.</p>;
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
  const featured = plan.priceCents > 0;

  return (
    <div className={featured ? 'lp-plan lp-plan-featured' : 'lp-plan'}>
      <h3>
        {plan.name}
        {current && <span className="badge badge-success">Plano atual</span>}
      </h3>
      <p className="lp-price">
        {formatPrice(plan.priceCents)}
        <small> / mês</small>
      </p>
      <ul>
        {features(plan.entitlements).map((feature) => (
          <li key={feature.text} data-off={feature.on ? 'false' : 'true'}>
            <Icon name={feature.on ? 'check' : 'x'} />
            {feature.text}
          </li>
        ))}
      </ul>
      {!current && featured && (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onUpgrade}
          disabled={upgrading}
        >
          {upgrading ? 'Abrindo checkout...' : `Assinar ${plan.name}`}
        </button>
      )}
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
    return <p className="muted">Carregando...</p>;
  }
  if (billing.isError) {
    return <p role="alert">{getErrorMessage(billing.error)}</p>;
  }

  const state = billing.data;
  const currentPlan = state.plans.find((plan) => plan.id === state.plan);
  const actionError = checkout.error ?? cancel.error ?? resume.error;
  const paid = state.plan !== 'FREE';

  return (
    <>
      <Notice />

      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          margin: '16px 0 24px',
        }}
      >
        <div>
          <div className="kpi-label">Plano atual</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <strong style={{ fontSize: '1.4rem' }}>{currentPlan?.name}</strong>
            {paid && state.cancelAtPeriodEnd && (
              <span className="badge badge-warning">Cancelamento agendado</span>
            )}
            {paid && !state.cancelAtPeriodEnd && <span className="badge badge-success">Ativo</span>}
          </div>
          {paid && state.currentPeriodEnd && (
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {state.cancelAtPeriodEnd
                ? `Acesso até ${formatDate(state.currentPeriodEnd)}.`
                : `Renova em ${formatDate(state.currentPeriodEnd)}.`}
            </p>
          )}
        </div>
        {paid &&
          (state.cancelAtPeriodEnd ? (
            <button
              type="button"
              className="btn"
              onClick={() => resume.mutate()}
              disabled={resume.isPending}
            >
              Manter minha assinatura
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              Cancelar ao fim do período
            </button>
          ))}
      </div>

      {actionError && <p role="alert">{getErrorMessage(actionError)}</p>}

      <div className="lp-plans" style={{ maxWidth: 'none' }}>
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

      <p className="hint" style={{ marginTop: 20 }}>
        Ambiente de teste: o pagamento é simulado e nenhum valor real é cobrado.
      </p>
    </>
  );
}

export default function BillingPage() {
  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Plano</h1>
          <p>Veja seu plano, os limites e faça upgrade quando precisar.</p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Carregando...</p>}>
        <BillingContent />
      </Suspense>
    </main>
  );
}
