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
import { signInSchema, type SignInInput } from '@/lib/validations/auth'

export function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  async function onSubmit(data: SignInInput) {
    setServerError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setServerError('Email veya şifre hatalı.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="glass rounded-xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-display text-2xl font-bold">Tekrar hoş geldin</h1>
        <p className="text-muted-foreground text-sm">Hikayeye devam et</p>
      </div>

      <Button variant="outline" className="w-full border-border" onClick={signInWithGoogle} type="button">
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748z"/>
        </svg>
        Google ile giriş yap
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
            <p id="email-error" role="alert" className="text-destructive text-xs">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="bg-surface-2 border-border"
            aria-describedby={errors.password ? 'password-error' : undefined}
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="text-destructive text-xs">
              {errors.password.message}
            </p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="text-destructive text-sm text-center">{serverError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Giriş Yap
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Hesabın yok mu?{' '}
        <Link href="/signup" className="text-primary hover:underline">Kayıt ol</Link>
      </p>
    </div>
  )
}
