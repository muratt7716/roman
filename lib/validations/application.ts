import { z } from 'zod'

export const createApplicationSchema = z.object({
  intro: z.string().min(50, 'Tanıtım en az 50 karakter olmalı').max(500),
  writing_sample: z.string().max(2000).optional(),
  portfolio_links: z.array(z.string().url('Geçerli bir URL girin')).max(5),
})

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
