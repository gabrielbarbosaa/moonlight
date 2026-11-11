'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CreateTenantForm, ROOT_DOMAIN } from '@/components/create-tenant-form';
import { authApi, tenantsApi } from '@/lib/api';

const mainStyle = { maxWidth: 640, margin: '80px auto', padding: '0 16px' } as const;

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const tenants = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.listMine,
    enabled: me.isSuccess,
  });

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      router.replace('/admin/login');
    },
  });

  const unauthorized = isAxiosError(me.error) && me.error.response?.status === 401;

  useEffect(() => {
    if (unauthorized) router.replace('/admin/login');
  }, [unauthorized, router]);

  if (me.isPending || unauthorized || (me.isSuccess && tenants.isPending)) {
    return (
      <main style={mainStyle}>
        <p>Carregando...</p>
      </main>
    );
  }

  if (me.isError || tenants.isError) {
    return (
      <main style={mainStyle}>
        <p>Não foi possível carregar o painel.</p>
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

  return (
    <main style={mainStyle}>
      <h1>Painel</h1>
      <p>Logado como {me.data.email}.</p>

      {tenant ? (
        <section>
          <h2>{tenant.name}</h2>
          <p>
            Sua página:{' '}
            <a href={`${protocol}//${tenant.slug}.${ROOT_DOMAIN}`} target="_blank" rel="noreferrer">
              {tenant.slug}.{ROOT_DOMAIN}
            </a>
          </p>
          <p>
            <a href="/admin/editor">Editar página</a> · <a href="/admin/analytics">Analytics</a>
          </p>
          <p>
            Alternativa por caminho: <a href={`/s/${tenant.slug}`}>/s/{tenant.slug}</a>
          </p>
        </section>
      ) : (
        <section>
          <h2>Crie sua página</h2>
          <CreateTenantForm />
        </section>
      )}

      <p style={{ marginTop: 32 }}>
        <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending}>
          Sair
        </button>
      </p>
    </main>
  );
}
