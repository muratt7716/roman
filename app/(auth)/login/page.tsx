import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Giriş Yap' }

export default function LoginPage() {
  return <LoginForm />
}
