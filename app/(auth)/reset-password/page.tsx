import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Şifre Sıfırla — Kalem Birliği' }

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
