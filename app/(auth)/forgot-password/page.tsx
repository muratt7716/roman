import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Şifremi Unuttum — Kalem Birliği' }

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
