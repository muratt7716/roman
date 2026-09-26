/**
 * Giriş sonrası dönülecek adresi doğrular. Yalnızca site içi yol kabul edilir.
 *
 * Callback eskiden `${origin}${next}` birleştiriyordu. `next=@evil.com` ile bu
 * `https://writersquad.vercel.app@evil.com` olur — tarayıcı alan adından
 * öncesini kullanıcı adı sayar ve evil.com'a gider (açık yönlendirme).
 * `//evil.com` ve `/\evil.com` da tarayıcıda protokolsüz dış adres sayılır.
 */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
