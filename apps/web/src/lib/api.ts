import axios, { isAxiosError } from 'axios';
import type {
  AnalyticsSummary,
  BackofficeAuditEntry,
  BackofficeReport,
  BackofficeStats,
  BackofficeTenant,
  BillingState,
  BookingSettings,
  BookingSettingsInput,
  BookingsListQuery,
  MediaAssetDto,
  MediaLibrary,
  OwnerBookingsPage,
  Paginated,
  CreateTenantInput,
  PageContent,
  LoginInput,
  RegisterInput,
  VerifyCodeInput,
} from '@moonlight/schemas';

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
  suspendedReason: string | null;
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

export const billingApi = {
  me: () => api.get<BillingState>('/billing/me').then((res) => res.data),
  checkout: () =>
    api.post<{ url: string }>('/billing/checkout', { plan: 'PRO' }).then((res) => res.data),
  cancel: () => api.post<BillingState>('/billing/cancel').then((res) => res.data),
  resume: () => api.post<BillingState>('/billing/resume').then((res) => res.data),
};

export const bookingApi = {
  getSettings: () => api.get<BookingSettings>('/booking/me/settings').then((res) => res.data),
  saveSettings: (input: BookingSettingsInput) =>
    api.put<BookingSettings>('/booking/me/settings', input).then((res) => res.data),
  listBookings: (params: Partial<BookingsListQuery>) =>
    api.get<OwnerBookingsPage>('/booking/me/bookings', { params }).then((res) => res.data),
  cancel: (id: string) => api.post(`/booking/me/bookings/${id}/cancel`).then(() => undefined),
};

export const backofficeApi = {
  stats: () => api.get<BackofficeStats>('/backoffice/stats').then((res) => res.data),
  tenants: (params: { search?: string; status?: 'ACTIVE' | 'SUSPENDED'; page?: number }) =>
    api.get<Paginated<BackofficeTenant>>('/backoffice/tenants', { params }).then((res) => res.data),
  suspend: (id: string, reason: string) =>
    api.post(`/backoffice/tenants/${id}/suspend`, { reason }).then(() => undefined),
  reactivate: (id: string) =>
    api.post(`/backoffice/tenants/${id}/reactivate`).then(() => undefined),
  reports: (params: { status?: 'OPEN' | 'RESOLVED' | 'DISMISSED'; page?: number }) =>
    api.get<Paginated<BackofficeReport>>('/backoffice/reports', { params }).then((res) => res.data),
  resolveReport: (id: string, input: { action: 'dismiss' | 'suspend'; note?: string }) =>
    api.post(`/backoffice/reports/${id}/resolve`, input).then(() => undefined),
  audit: () => api.get<BackofficeAuditEntry[]>('/backoffice/audit').then((res) => res.data),
};

export const mediaApi = {
  list: () => api.get<MediaLibrary>('/media').then((res) => res.data),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<MediaAssetDto>('/media', form).then((res) => res.data);
  },
  remove: (id: string) => api.delete(`/media/${id}`).then(() => undefined),
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
    const data = error.response.data as { code?: string; message?: string } | undefined;
    if (error.response.status === 403 && data?.code === 'PLAN_LIMIT' && data.message) {
      return `${data.message} Veja os planos em /admin/billing.`;
    }
    if (error.response.status === 413) return 'A imagem passa de 5 MB.';
    if (error.response.status === 409 && data?.message) return data.message;
    if (error.response.status === 409)
      return 'Este endereço já está em uso ou o limite foi atingido.';
    if (error.response.status === 400 && data?.message && /imagem/i.test(data.message))
      return data.message;
    if (error.response.status === 401) return 'Credenciais ou código inválidos.';
    if (error.response.status === 400) return 'Confira os dados informados.';
    if (error.response.status === 429) return 'Muitas tentativas. Tente novamente em instantes.';
  }
  return 'Algo deu errado. Tente novamente.';
}
