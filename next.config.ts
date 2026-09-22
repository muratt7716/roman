import type { NextConfig } from 'next'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

// Turbopack'in kök dizini: modül çözümlemesinin sınırı ve dosya izlemenin
// kapsamı. Next bunu kilit dosyasının yerinden tahmin eder; tahmine
// bırakmamak için açıkça veriyoruz. Sabit yol yazmıyoruz — config dosyasının
// kendi konumundan türetiliyor, böylece başka makinede de doğru kalır.
const projectRoot = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

export default nextConfig
