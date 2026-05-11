import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/SignupForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Kayıt Ol — Writer Squad' }

export default function SignupPage() {
  return <SignupForm />
}
