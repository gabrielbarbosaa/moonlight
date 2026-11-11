import axios, { isAxiosError } from 'axios';
import type {
  AnalyticsSummary,
  CreateTenantInput,
  PageContent,
  LoginInput,
  RegisterInput,
  VerifyCodeInput,
} from '@sitebuilder/schemas';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  withCredentials: true,
});

export type CurrentUser = {
  id: string;
  email: string;
  role: 'USER' | 'SUPERADMIN';
  emailVerified: boolean;
};

export const authApi = {
  register: (input: RegisterInput) =>
    api.post<{ challengeId: string }>('/auth/register', input).then((res) => res.data),
  login: (input: LoginInput) =>
    api.post<{ challengeId: string }>('/auth/login', input).then((res) => res.data),
  verify: (input: VerifyCodeInput) =>
    api.post<{ userId: string }>('/auth/verify', input).then((res) => res.data),
  logout: () => api.post('/auth/logout').then(() => undefined),
  me: () => api.get<CurrentUser>('/auth/me').then((res) => res.data),
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
};

export const tenantsApi = {
  create: (input: CreateTenantInput) => api.post<Tenant>('/tenants', input).then((res) => res.data),
  listMine: () => api.get<Tenant[]>('/tenants/me').then((res) => res.data),
  slugAvailable: (slug: string) =>
    api
      .get<{ slug: string; available: boolean }>('/tenants/slug-available', { params: { slug } })
      .then((res) => res.data),
};

export const analyticsApi = {
  summary: (days: number) =>
    api.get<AnalyticsSummary>('/analytics/me', { params: { days } }).then((res) => res.data),
};

export type PageState = {
  draft: PageContent;
  published: PageContent | null;
  publishedAt: string | null;
  updatedAt: string;
  hasUnpublishedChanges: boolean;
};

export const pagesApi = {
  getMine: () => api.get<PageState>('/pages/me').then((res) => res.data),
  saveDraft: (content: PageContent) =>
    api.put<PageState>('/pages/me/draft', content).then((res) => res.data),
  publish: () => api.post<PageState>('/pages/me/publish').then((res) => res.data),
};

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'Não foi possível falar com o servidor.';
    if (error.response.status === 409)
      return 'Este endereço já está em uso ou o limite foi atingido.';
    if (error.response.status === 401) return 'Credenciais ou código inválidos.';
    if (error.response.status === 400) return 'Confira os dados informados.';
    if (error.response.status === 429) return 'Muitas tentativas. Tente novamente em instantes.';
  }
  return 'Algo deu errado. Tente novamente.';
}
