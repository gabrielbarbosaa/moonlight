'use client';

import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CreateTenantForm, ROOT_DOMAIN } from '@/components/create-tenant-form';
import { Icon, type IconName } from '@/components/icons';
import { authApi, billingApi, tenantsApi } from '@/lib/api';

type QuickLink = { href: string; icon: IconName; title: string; text: string };

function QuickCard({ link }: { link: QuickLink }) {
  return (
    <Link href={link.href} className="card card-link">
      <span className="icon-tile">
        <Icon name={link.icon} />
      </span>
      <h3 style={{ margin: '14px 0 4px' }}>{link.title}</h3>
      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
        {link.text}
      </p>
    </Link>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const tenants = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.listMine,
    enabled: me.isSuccess,
  });
  const billing = useQuery({
    queryKey: ['billing'],
    queryFn: billingApi.me,
    enabled: me.isSuccess,
  });

  const unauthorized = isAxiosError(me.error) && me.error.response?.status === 401;

  useEffect(() => {
    if (unauthorized) router.replace('/admin/login');
  }, [unauthorized, router]);

  if (me.isPending || unauthorized || (me.isSuccess && tenants.isPending)) {
    return (
      <main className="page">
        <p className="muted">Carregando...</p>
      </main>
    );
  }

  if (me.isError || tenants.isError) {
    return (
      <main className="page page-narrow">
        <p role="alert">Não foi possível carregar o painel.</p>
        <button
          type="button"
          onClick={() => {
            me.refetch();
            tenants.refetch();
          }}
        >
          Tentar de novo
        </button>
      </main>
    );
  }

  const tenant = tenants.data?.[0];
  const protocol = typeof window === 'undefined' ? 'http:' : window.location.protocol;
  const publicUrl = tenant ? `${protocol}//${tenant.slug}.${ROOT_DOMAIN}` : '';
  const planName = billing.data?.plans.find((plan) => plan.id === billing.data?.plan)?.name;

  const quickLinks: QuickLink[] = [
    {
      href: '/admin/editor',
      icon: 'pencil',
      title: 'Editor',
      text: 'Blocos, temas e pré-visualização ao vivo.',
    },
    {
      href: '/admin/agenda',
      icon: 'calendar',
      title: 'Agenda',
      text: 'Serviços, horários e reservas dos clientes.',
    },
    {
      href: '/admin/analytics',
      icon: 'chart',
      title: 'Analytics',
      text: 'Visitas, visitantes únicos e cliques.',
    },
    {
      href: '/admin/billing',
      icon: 'card',
      title: 'Plano',
      text: planName ? `Você está no plano ${planName}.` : 'Veja seu plano e os limites.',
    },
  ];
  if (me.data.role === 'SUPERADMIN') {
    quickLinks.push({
      href: '/admin/backoffice',
      icon: 'shield',
      title: 'Backoffice',
      text: 'Moderação, denúncias e auditoria.',
    });
  }

  if (!tenant) {
    return (
      <main className="page page-narrow">
        <div className="page-head">
          <div>
            <h1>Crie sua página</h1>
            <p>Escolha um nome e um endereço. Depois você personaliza tudo no editor.</p>
          </div>
        </div>
        <div className="card">
          <CreateTenantForm />
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Painel</h1>
          <p>Gerencie sua página, reservas e plano.</p>
        </div>
      </div>

      {tenant.status === 'SUSPENDED' && (
        <p role="alert">
          Sua página está suspensa e não aparece publicamente.
          {tenant.suspendedReason ? ` Motivo: ${tenant.suspendedReason}.` : ''} Entre em contato com
          o suporte para contestar.
        </p>
      )}

      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>{tenant.name}</h2>
            <span
              className={tenant.status === 'ACTIVE' ? 'badge badge-success' : 'badge badge-danger'}
            >
              {tenant.status === 'ACTIVE' ? 'No ar' : 'Suspensa'}
            </span>
            {planName && <span className="badge">{planName}</span>}
          </div>
          <a href={publicUrl} target="_blank" rel="noreferrer">
            {tenant.slug}.{ROOT_DOMAIN}
          </a>
          <p className="hint" style={{ margin: '2px 0 0' }}>
            Também acessível em <a href={`/s/${tenant.slug}`}>/s/{tenant.slug}</a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn" href={publicUrl} target="_blank" rel="noreferrer">
            <Icon name="external" />
            Ver página
          </a>
          <Link className="btn btn-primary" href="/admin/editor">
            <Icon name="pencil" />
            Editar página
          </Link>
        </div>
      </div>

      <div className="card-grid">
        {quickLinks.map((link) => (
          <QuickCard key={link.href} link={link} />
        ))}
      </div>
    </main>
  );
}
