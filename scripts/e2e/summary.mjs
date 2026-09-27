import { readFileSync } from 'node:fs'
const { report, broken } = JSON.parse(readFileSync(new URL('./out/report.json', import.meta.url)))
console.log('KIRIK LİNKLER:', broken)
for (const r of report) {
  const issues = []
  if (r.status >= 400 || r.status === 0) issues.push(`HTTP ${r.status}`)
  if (r.url && r.url.split('?')[0] !== r.path.split('?')[0]) issues.push(`→ ${r.url}`)
  if (r.errorScreen) issues.push('HATA EKRANI')
  if (r.notFound) issues.push('404 içerik')
  if (r.overflow > 1) issues.push(`taşma ${r.overflow}px ${r.wide?.join(' | ')}`)
  if (r.errs?.length) issues.push(`konsol: ${r.errs.join(' ‖ ')}`)
  if (r.failed?.length) issues.push(`istek: ${r.failed.join(' ‖ ')}`)
  if (r.imgsBroken?.length) issues.push(`kırık görsel: ${r.imgsBroken.join(', ')}`)
  if (r.evalError) issues.push('eval: ' + r.evalError)
  if (issues.length) console.log(`\n[${r.vp}] ${r.path} (${r.who})\n   ` + issues.join('\n   '))
}
