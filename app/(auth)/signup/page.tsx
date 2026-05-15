import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/SignupForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Kayıt Ol — Kalem Birliği' }

export default function SignupPage() {
  return <SignupForm />
}
