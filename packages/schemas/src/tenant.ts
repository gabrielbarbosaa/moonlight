import { z } from 'zod';

/** Subdomínios que a plataforma usa e que nenhum tenant pode reservar. */
export const RESERVED_SLUGS = [
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'smtp',
  'static',
  'assets',
  'cdn',
  'status',
  'blog',
  'help',
  'support',
  'backoffice',
  'dashboard',
] as const;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Mínimo de 3 caracteres')
  .max(30, 'Máximo de 30 caracteres')
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    'Use apenas letras minúsculas, números e hífen (sem começar ou terminar com hífen)',
  )
  .refine((slug) => !(RESERVED_SLUGS as readonly string[]).includes(slug), {
    message: 'Este endereço é reservado',
  });

export const createTenantSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(60),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
