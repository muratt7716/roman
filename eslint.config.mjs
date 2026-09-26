import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // 91 kullanımın neredeyse tamamı Supabase'in tipsiz join sonuçları.
      // Doğru çözüm elle tiplemek değil, `supabase gen types` ile üretilen
      // Database tipini client'lara vermek — o yapılana kadar uyarı olarak
      // görünür kalsın, CI'yi kırmasın. (27 Eyl 2026)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Sunucu bileşenleri istek başına bir kez render edilir; burada Date.now()
    // "şu an" demektir, saf olmayan bir render değil. Kural istemci bileşenleri
    // için anlamlı ve orada açık kalıyor.
    files: ["app/**/page.tsx", "app/**/layout.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
]);

export default eslintConfig;
