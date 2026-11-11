'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTenantSchema, slugSchema } from '@sitebuilder/schemas';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getErrorMessage, tenantsApi } from '@/lib/api';

const fieldStyle = {
  display: 'block',
  width: '100%',
  padding: 8,
  marginTop: 4,
  boxSizing: 'border-box',
} as const;
const errorStyle = { color: '#b00020', fontSize: 14, margin: '4px 0 0' } as const;
const hintStyle = { color: '#555', fontSize: 14, margin: '4px 0 0' } as const;

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

  const availability = useQuery({
    queryKey: ['slug-available', debouncedSlug],
    queryFn: () => tenantsApi.slugAvailable(debouncedSlug),
    enabled: slugIsValid,
  });

  const mutation = useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const taken =
    slugIsValid &&
    debouncedSlug === slugValue.trim().toLowerCase() &&
    availability.data?.available === false;

  return (
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <label>
        Nome da página
        <input style={fieldStyle} {...form.register('name')} />
      </label>
      {form.formState.errors.name && (
        <p style={errorStyle}>Informe um nome de até 60 caracteres.</p>
      )}

      <label style={{ display: 'block', marginTop: 12 }}>
        Endereço
        <input style={fieldStyle} autoComplete="off" {...form.register('slug')} />
      </label>
      <p style={hintStyle}>
        {slugValue.trim()
          ? `${slugValue.trim().toLowerCase()}.${ROOT_DOMAIN}`
          : `seu-endereco.${ROOT_DOMAIN}`}
      </p>
      {form.formState.errors.slug && (
        <p style={errorStyle}>{form.formState.errors.slug.message ?? 'Endereço inválido.'}</p>
      )}
      {taken && <p style={errorStyle}>Este endereço já está em uso.</p>}
      {slugIsValid &&
        availability.data?.available === true &&
        debouncedSlug === slugValue.trim().toLowerCase() && (
          <p style={{ ...hintStyle, color: '#1b7a3a' }}>Endereço disponível.</p>
        )}

      {mutation.isError && <p style={errorStyle}>{getErrorMessage(mutation.error)}</p>}

      <button
        type="submit"
        disabled={mutation.isPending || taken}
        style={{ width: '100%', padding: 10, marginTop: 16, cursor: 'pointer' }}
      >
        {mutation.isPending ? 'Criando...' : 'Criar minha página'}
      </button>
    </form>
  );
}
