import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'

// Yayındaki içerik değiştikçe sitemap de değişmeli; saatlik yenileme hem
// arama motorları hem Supabase kotası için makul bir denge.
export const revalidate = 3600

/**
 * Yalnızca herkese açık adresler listelenir. (app) ve (auth) altındaki her şey
 * oturum ister — sitemap'e girerse arama motoru giriş sayfasına çarpar.
 *
 * Görünürlük kuralları uygulamanınkiyle aynı tutuldu:
 *   /projects/[slug]        → 'open' ve 'published' (keşfet sayfasıyla aynı)
 *   /projects/[slug]/read/… → yalnızca 'published' (kütüphaneyle aynı)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/kitaplik`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/writers`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/discover/magazines`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/kullanim-kosullari`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/gizlilik-politikasi`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const supabase = await createClient()

    const [{ data: projects }, { data: profiles }] = await Promise.all([
      supabase
        .from('projects')
        .select('slug, visibility, updated_at')
        .in('visibility', ['open', 'published'])
        .order('updated_at', { ascending: false })
        .limit(5000),
      supabase
        .from('profiles')
        .select('username, created_at')
        .order('created_at', { ascending: false })
        .limit(5000),
    ])

    const publishedSlugs = (projects ?? [])
      .filter(p => p.visibility === 'published')
      .map(p => p.slug as string)

    // Yayındaki projelerin final bölümleri — okuma sayfaları asıl SEO değeri
    // olan içerik. Taslak bölümler okuma sayfasında da görünmez.
    let chapterRoutes: MetadataRoute.Sitemap = []
    if (publishedSlugs.length > 0) {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id, updated_at, project:projects!inner(slug, visibility)')
        .eq('status', 'final')
        .limit(5000)

      chapterRoutes = (chapters ?? [])
        .map(c => {
          const project = (Array.isArray(c.project) ? c.project[0] : c.project) as
            | { slug: string; visibility: string }
            | null
          if (!project || project.visibility !== 'published') return null
          return {
            url: `${SITE_URL}/projects/${project.slug}/read/${c.id}`,
            lastModified: c.updated_at ? new Date(c.updated_at as string) : undefined,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          }
        })
        .filter(Boolean) as MetadataRoute.Sitemap
    }

    const projectRoutes: MetadataRoute.Sitemap = (projects ?? []).flatMap(p => {
      const base = {
        lastModified: p.updated_at ? new Date(p.updated_at as string) : undefined,
        changeFrequency: 'weekly' as const,
      }
      const routes: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/projects/${p.slug}`, ...base, priority: 0.8 },
      ]
      if (p.visibility === 'published') {
        routes.push({ url: `${SITE_URL}/projects/${p.slug}/read`, ...base, priority: 0.8 })
      }
      return routes
    })

    const profileRoutes: MetadataRoute.Sitemap = (profiles ?? []).map(p => ({
      url: `${SITE_URL}/u/${p.username}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))

    return [...staticRoutes, ...projectRoutes, ...chapterRoutes, ...profileRoutes]
  } catch {
    // DB erişilemezse (Supabase ücretsiz katman uykuda olabilir) sitemap'in
    // tamamen boş dönmesindense statik adreslerle dönmesi yeğdir.
    return staticRoutes
  }
}
