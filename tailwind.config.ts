import type { Config } from 'tailwindcss'

// Tailwind v4: theme is defined in globals.css via @theme directive
// This file only handles content paths
const config: Config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
}

export default config
