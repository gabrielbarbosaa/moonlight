'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTenantSchema, slugSchema } from '@sitebuilder/schemas';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getErrorMessage, tenantsApi } from '@/lib/api';

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CreateTenantForm() {
  const queryClient = useQueryClient();
  const form = useForm<{ name: string; slug: string }>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: { name: '', slug: '' },
  });

  const slugValue = form.watch('slug') ?? '';
  const debouncedSlug = useDebounced(slugValue, 400);
  const slugIsValid = slugSchema.safeParse(debouncedSlug).success;
  const normalizedSlug = slugValue.trim().toLowerCase();

  const availability = useQuery({
    queryKey: ['slug-available', debouncedSlug],
    queryFn: () => tenantsApi.slugAvailable(debouncedSlug),
    enabled: slugIsValid,
  });

  const mutation = useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const settled = slugIsValid && debouncedSlug === normalizedSlug;
  const taken = settled && availability.data?.available === false;
  const free = settled && availability.data?.available === true;

  return (
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <label className="field">
        Nome da página
        <input placeholder="Ex.: Marina Costa" {...form.register('name')} />
      </label>
      {form.formState.errors.name && (
        <p className="error-text">Informe um nome de até 60 caracteres.</p>
      )}

      <label className="field">
        Endereço
        <input autoComplete="off" placeholder="marina" {...form.register('slug')} />
      </label>
      <p className="hint">
        Sua página ficará em <strong>{normalizedSlug ? normalizedSlug : 'seu-endereco'}</strong>.
        {ROOT_DOMAIN}
      </p>
      {form.formState.errors.slug && (
        <p className="error-text">{form.formState.errors.slug.message ?? 'Endereço inválido.'}</p>
      )}
      {taken && <p className="error-text">Este endereço já está em uso.</p>}
      {free && (
        <p className="hint" style={{ color: 'var(--success)' }}>
          Endereço disponível.
        </p>
      )}

      {mutation.isError && <p className="error-text">{getErrorMessage(mutation.error)}</p>}

      <button
        type="submit"
        disabled={mutation.isPending || taken}
        className="btn-lg"
        style={{ width: '100%', marginTop: 20 }}
      >
        {mutation.isPending ? 'Criando...' : 'Criar minha página'}
      </button>
    </form>
  );
}
