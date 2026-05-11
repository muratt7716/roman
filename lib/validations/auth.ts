import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  username: z
    .string()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalı')
    .max(30, 'Kullanıcı adı en fazla 30 karakter olabilir')
    .regex(/^[a-zA-Z0-9_]+$/, 'Sadece harf, rakam ve alt çizgi kullanılabilir'),
})

export const signInSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
  password: z.string().min(1, 'Şifre zorunludur'),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
