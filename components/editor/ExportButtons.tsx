'use client'

import { useState } from 'react'
import { Printer, FileText, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Chapter {
  title: string
  content: string
  word_count: number
  order_index: number
}

interface Props {
  projectTitle: string
  chapters: Chapter[]
}

export function ExportButtons({ projectTitle, chapters }: Props) {
  const [downloading, setDownloading] = useState(false)

  function printAsPDF() {
    window.print()
  }

  function downloadAsText() {
    setDownloading(true)
    const lines: string[] = [
      projectTitle.toUpperCase(),
      '='.repeat(projectTitle.length),
      '',
    ]

    chapters.forEach((ch, i) => {
      lines.push(`BÖLÜM ${i + 1}: ${ch.title.toUpperCase()}`)
      lines.push('-'.repeat(40))
      // Strip HTML tags
      const text = ch.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
      lines.push(text)
      lines.push('')
      lines.push('')
    })

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectTitle.replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ\s]/gi, '').trim()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  function downloadAsHTML() {
    setDownloading(true)
    const chaptersHTML = chapters.map((ch, i) => `
      <section class="chapter">
        <h2>Bölüm ${i + 1}</h2>
        <h3>${ch.title}</h3>
        <div class="content">${ch.content}</div>
      </section>
    `).join('\n<hr>\n')

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${projectTitle}</title>
<style>
  body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.8; max-width: 700px; margin: 0 auto; padding: 60px 40px; color: #1a1a1a; }
  h1 { font-size: 24pt; text-align: center; margin-bottom: 60px; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.15em; color: #666; margin-top: 60px; margin-bottom: 4px; }
  h3 { font-size: 18pt; margin-top: 0; margin-bottom: 30px; }
  p { margin: 0 0 1em; text-align: justify; }
  blockquote { border-left: 3px solid #ccc; padding-left: 1em; color: #555; }
  hr { border: none; border-top: 1px solid #ddd; margin: 60px 0; }
</style>
</head>
<body>
<h1>${projectTitle}</h1>
${chaptersHTML}
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectTitle.replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ\s]/gi, '').trim()}.html`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <Button
        type="button"
        onClick={printAsPDF}
        className="gap-2 bg-primary hover:bg-primary/90 text-white"
      >
        <Printer className="w-4 h-4" />
        PDF Olarak Yazdır
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={downloadAsHTML}
        disabled={downloading}
        className="gap-2 border-border"
      >
        <FileDown className="w-4 h-4" />
        Word/HTML İndir
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={downloadAsText}
        disabled={downloading}
        className="gap-2 border-border"
      >
        <FileText className="w-4 h-4" />
        Düz Metin İndir
      </Button>
    </div>
  )
}
