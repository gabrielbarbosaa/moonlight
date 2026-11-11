import { z } from 'zod';

export const safeUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return ['http:', 'https:', 'mailto:'].includes(url.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL inválida' },
  );
