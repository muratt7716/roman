import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Giriş Yap — Writer Squad' }

export default function LoginPage() {
  return <LoginForm />
}
