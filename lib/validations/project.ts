import { z } from 'zod'

export const createProjectSchema = z.object({
  title: z.string().min(3, 'Başlık en az 3 karakter olmalı').max(100),
  genre: z.string().min(1, 'Tür seçimi zorunludur'),
  synopsis: z.string().min(50, 'Özet en az 50 karakter olmalı').max(1000),
  tags: z.array(z.string()).max(10, 'En fazla 10 etiket eklenebilir'),
  target_word_count: z.number().min(1000).max(1000000).optional(),
  visibility: z.enum(['draft', 'open', 'closed', 'published']).default('draft'),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Rol adı en az 2 karakter olmalı').max(50),
  description: z.string().max(200).optional(),
  max_members: z.number().min(1).max(10).default(1),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>
