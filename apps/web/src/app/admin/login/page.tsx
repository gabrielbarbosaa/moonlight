'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { loginSchema, registerSchema, verifyCodeSchema } from '@moonlight/schemas';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PageRenderer } from '@moonlight/renderer';
import { THEME_PRESETS, samplePage } from '@moonlight/schemas';
import { Brand } from '@/components/brand';
import { Icon } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { authApi, getErrorMessage } from '@/lib/api';

const asideTheme = THEME_PRESETS.find((item) => item.id === 'aurora')?.theme;
const asidePage = samplePage(asideTheme ?? THEME_PRESETS[0].theme, 'Studio Aurora');

const codeSchema = verifyCodeSchema.pick({ code: true });

type Mode = 'login' | 'register';

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
      <label className="field">
        E-mail
        <input type="email" autoComplete="email" {...form.register('email')} />
      </label>
      {form.formState.errors.email && <p className="error-text">E-mail inválido.</p>}

      <label className="field">
        Senha
        <input
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          {...form.register('password')}
        />
      </label>
      {mode === 'register' && !form.formState.errors.password && (
        <p className="hint">Use pelo menos 10 caracteres.</p>
      )}
      {form.formState.errors.password && (
        <p className="error-text">{form.formState.errors.password.message ?? 'Senha inválida.'}</p>
      )}

      {mutation.isError && <p className="error-text">{getErrorMessage(mutation.error)}</p>}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="btn-lg"
        style={{ width: '100%', marginTop: 20 }}
      >
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
      <p className="muted">
        Enviamos um código de 6 dígitos para o seu e-mail. Ele expira em 10 minutos.
      </p>
      <label className="field">
        Código
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          style={{ fontSize: '1.3rem', letterSpacing: '0.3em', textAlign: 'center' }}
          {...form.register('code')}
        />
      </label>
      {form.formState.errors.code && (
        <p className="error-text">{form.formState.errors.code.message ?? 'Código inválido.'}</p>
      )}
      {mutation.isError && <p className="error-text">{getErrorMessage(mutation.error)}</p>}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="btn-lg"
        style={{ width: '100%', marginTop: 20 }}
      >
        {mutation.isPending ? 'Verificando...' : 'Confirmar'}
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={onBack}
        style={{ width: '100%', marginTop: 8 }}
      >
        Voltar
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [challengeId, setChallengeId] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'register') {
      setMode('register');
    }
  }, []);

  return (
    <div className="auth-split">
      <aside className="auth-aside lp-night" aria-hidden="true">
        <div className="lp-stars" />
        <div className="auth-moon" />
        <Brand />
        <div className="auth-aside-copy">
          <h2>
            Sua página, <span className="lp-gradient-text">brilhando</span> em minutos
          </h2>
          <ul className="auth-points">
            <li>
              <Icon name="check" />
              Blocos, temas e animações sem código
            </li>
            <li>
              <Icon name="check" />
              Agenda de reservas e estatísticas
            </li>
            <li>
              <Icon name="check" />
              Pré-visualização ao vivo no celular
            </li>
          </ul>
        </div>
        <div className="auth-phone">
          <PageRenderer content={asidePage} fill="container" />
        </div>
      </aside>

      <section className="auth-main">
        <div className="auth-top">
          <span className="auth-top-brand">
            <Brand />
          </span>
          <ThemeToggle />
        </div>
        <div className="auth-card">
          <h1>
            {challengeId ? 'Confirme seu e-mail' : mode === 'login' ? 'Entrar' : 'Criar sua conta'}
          </h1>
          {!challengeId && (
            <p className="muted">
              {mode === 'login'
                ? 'Acesse o painel da sua página.'
                : 'Comece grátis. Você poderá mudar o visual quando quiser.'}
            </p>
          )}

          {challengeId ? (
            <CodeForm challengeId={challengeId} onBack={() => setChallengeId(null)} />
          ) : (
            <>
              <CredentialsForm key={mode} mode={mode} onChallenge={setChallengeId} />
              <p className="muted" style={{ margin: '22px 0 0', textAlign: 'center' }}>
                {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setMode(mode === 'login' ? 'register' : 'login');
                  }}
                >
                  {mode === 'login' ? 'Criar conta' : 'Entrar'}
                </a>
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
