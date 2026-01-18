import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.string().min(1, 'Authors is required'),
  publishedBy: z.string().min(1, 'PublishedBy is required'),
});

export const updateBookSchema = z.object({
  title: z.string().min(1).optional(),
  authors: z.string().min(1).optional(),
  publishedBy: z.string().min(1).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
