import { describe, it, expect } from 'vitest'
import { signUpSchema, signInSchema } from '@/lib/validations/auth'

describe('signUpSchema', () => {
  it('geçerli kayıt verisini kabul eder', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
    })
    expect(result.success).toBe(true)
  })

  it('geçersiz email reddeder', () => {
    const result = signUpSchema.safeParse({
      email: 'notanemail',
      password: 'password123',
      username: 'testuser',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('kısa şifreyi reddeder', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: '123',
      username: 'testuser',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })

  it('geçersiz username reddeder (boşluk içeren)', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      username: 'test user',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('username')
  })

  it('kısa username reddeder', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      username: 'ab',
    })
    expect(result.success).toBe(false)
  })
})

describe('signInSchema', () => {
  it('geçerli giriş verisini kabul eder', () => {
    const result = signInSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('boş alanları reddeder', () => {
    const result = signInSchema.safeParse({ email: '', password: '' })
    expect(result.success).toBe(false)
  })
})
