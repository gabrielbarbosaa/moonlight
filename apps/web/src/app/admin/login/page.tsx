'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { loginSchema, registerSchema, verifyCodeSchema } from '@sitebuilder/schemas';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authApi, getErrorMessage } from '@/lib/api';

const codeSchema = verifyCodeSchema.pick({ code: true });

type Mode = 'login' | 'register';

const fieldStyle = {
  display: 'block',
  width: '100%',
  padding: 8,
  marginTop: 4,
  boxSizing: 'border-box',
} as const;
const buttonStyle = { width: '100%', padding: 10, marginTop: 16, cursor: 'pointer' } as const;
const errorStyle = { color: '#b00020', fontSize: 14, margin: '4px 0 0' } as const;

function CredentialsForm({
  mode,
  onChallenge,
}: {
  mode: Mode;
  onChallenge: (challengeId: string) => void;
}) {
  const form = useForm<{ email: string; password: string }>({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: { email: string; password: string }) =>
      mode === 'login' ? authApi.login(values) : authApi.register(values),
    onSuccess: (data) => onChallenge(data.challengeId),
  });

  return (
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <label>
        E-mail
        <input type="email" autoComplete="email" style={fieldStyle} {...form.register('email')} />
      </label>
      {form.formState.errors.email && <p style={errorStyle}>E-mail inválido.</p>}

      <label style={{ display: 'block', marginTop: 12 }}>
        Senha
        <input
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          style={fieldStyle}
          {...form.register('password')}
        />
      </label>
      {form.formState.errors.password && (
        <p style={errorStyle}>{form.formState.errors.password.message ?? 'Senha inválida.'}</p>
      )}

      {mutation.isError && <p style={errorStyle}>{getErrorMessage(mutation.error)}</p>}

      <button type="submit" disabled={mutation.isPending} style={buttonStyle}>
        {mutation.isPending ? 'Enviando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
      </button>
    </form>
  );
}

function CodeForm({ challengeId, onBack }: { challengeId: string; onBack: () => void }) {
  const router = useRouter();
  const form = useForm<{ code: string }>({ resolver: zodResolver(codeSchema) });

  const mutation = useMutation({
    mutationFn: (values: { code: string }) => authApi.verify({ challengeId, code: values.code }),
    onSuccess: () => router.replace('/admin'),
  });

  return (
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <p>Enviamos um código de 6 dígitos para o seu e-mail. Ele expira em 10 minutos.</p>
      <label>
        Código
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          style={fieldStyle}
          {...form.register('code')}
        />
      </label>
      {form.formState.errors.code && (
        <p style={errorStyle}>{form.formState.errors.code.message ?? 'Código inválido.'}</p>
      )}
      {mutation.isError && <p style={errorStyle}>{getErrorMessage(mutation.error)}</p>}

      <button type="submit" disabled={mutation.isPending} style={buttonStyle}>
        {mutation.isPending ? 'Verificando...' : 'Confirmar'}
      </button>
      <button type="button" onClick={onBack} style={{ ...buttonStyle, marginTop: 8 }}>
        Voltar
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [challengeId, setChallengeId] = useState<string | null>(null);

  return (
    <main style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <h1>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>

      {challengeId ? (
        <CodeForm challengeId={challengeId} onBack={() => setChallengeId(null)} />
      ) : (
        <>
          <CredentialsForm key={mode} mode={mode} onChallenge={setChallengeId} />
          <p style={{ marginTop: 24 }}>
            {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              style={{
                background: 'none',
                border: 0,
                color: '#0645ad',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </>
      )}
    </main>
  );
}
