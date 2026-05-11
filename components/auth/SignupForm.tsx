'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema, type SignUpInput } from '@/lib/validations/auth'

export function SignupForm() {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  })

  async function onSubmit(data: SignUpInput) {
    setServerError(null)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { username: data.username },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) {
      setServerError(error.message === 'User already registered'
        ? 'Bu email zaten kayıtlı.'
        : 'Bir hata oluştu. Lütfen tekrar dene.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function signUpWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="glass rounded-xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-display text-2xl font-bold">Topluluğa katıl</h1>
        <p className="text-muted-foreground text-sm">Birlikte yazmaya başla</p>
      </div>

      <Button variant="outline" className="w-full border-border" onClick={signUpWithGoogle} type="button">
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748z"/>
        </svg>
        Google ile kayıt ol
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-2 text-muted-foreground">veya</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="username">Kullanıcı Adı</Label>
          <Input
            id="username"
            autoComplete="username"
            placeholder="yazaradi"
            className="bg-surface-2 border-border"
            aria-describedby={errors.username ? 'username-error' : 'username-hint'}
            aria-invalid={!!errors.username}
            {...register('username')}
          />
          {errors.username ? (
            <p id="username-error" role="alert" className="text-destructive text-xs">{errors.username.message}</p>
          ) : (
            <p id="username-hint" className="text-muted-foreground text-xs">Harf, rakam ve alt çizgi kullanılabilir</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="bg-surface-2 border-border"
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-destructive text-xs">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="bg-surface-2 border-border"
            aria-describedby={errors.password ? 'password-error' : 'password-hint'}
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password ? (
            <p id="password-error" role="alert" className="text-destructive text-xs">{errors.password.message}</p>
          ) : (
            <p id="password-hint" className="text-muted-foreground text-xs">En az 8 karakter</p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="text-destructive text-sm text-center">{serverError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Hesap Oluştur
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Zaten hesabın var mı?{' '}
        <Link href="/login" className="text-primary hover:underline">Giriş yap</Link>
      </p>
    </div>
  )
}
