import { Hono } from 'hono'
import Anthropic from '@anthropic-ai/sdk'
import { parseBuffer } from 'music-metadata'

const app = new Hono()

app.get('/', (c) => {
  return new Response(Bun.file(`${import.meta.dir}/public/index.html`))
})

app.post('/api/recommend', async (c) => {
  try {
    const form = await c.req.formData()
    const category = (form.get('category') as string || '').trim()

    if (!['music', 'book', 'tv', 'film', 'fashion'].includes(category)) {
      return c.json({ error: 'Invalid category.' }, 400)
    }

    const ai = new Anthropic({
      baseURL: process.env.SANTAI_AI_BASE_URL,
      apiKey: process.env.SANTAI_AI_TOKEN || 'placeholder',
    })

    let messages: Anthropic.MessageParam[]

    // ── Music ────────────────────────────────────────────────────────
    if (category === 'music') {
      const file   = form.get('file') as File | null
      const textTitle  = (form.get('title')  as string || '').trim()
      const textArtist = (form.get('artist') as string || '').trim()

      if (textTitle) {
        // Text-based search
        messages = [{ role: 'user', content: `You are a music curator. Recommend 5 songs similar to "${textTitle}"${textArtist ? ' by ' + textArtist : ''}. Consider genre, era, mood, and artist style. Vary the picks.

Return ONLY valid JSON:
{
  "detected": { "title": "${textTitle.replace(/"/g, '\\"')}", "creator": "${textArtist.replace(/"/g, '\\"')}" },
  "recommendations": [
    { "title": "...", "creator": "artist", "year": "...", "reason": "One specific sentence." }
  ]
}` }]

      } else if (file && file.size > 0) {
        // File upload
        if (file.size > 50 * 1024 * 1024) return c.json({ error: 'File too large. Max 50 MB.' }, 400)

        const buffer = Buffer.from(await file.arrayBuffer())
        const meta: Record<string, string> = {}
        try {
          const parsed = await parseBuffer(buffer, { mimeType: file.type })
          const { common } = parsed
          if (common.title)       meta.title  = common.title
          if (common.artist)      meta.artist = common.artist
          if (common.album)       meta.album  = common.album
          if (common.genre?.[0])  meta.genre  = common.genre[0]
          if (common.year)        meta.year   = String(common.year)
          if (common.bpm)         meta.bpm    = String(Math.round(common.bpm))
        } catch {}
        if (!meta.title) meta.title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

        const info = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n')

        messages = [{ role: 'user', content: `You are a music curator. Recommend 5 songs based on this track's metadata. Consider genre, era, mood, and artist style. Vary the picks.

${info}

Return ONLY valid JSON:
{
  "detected": { "title": "song title", "creator": "artist name" },
  "recommendations": [
    { "title": "...", "creator": "artist", "year": "...", "reason": "One specific sentence." }
  ]
}` }]

      } else {
        return c.json({ error: 'Please upload a file or enter a song title.' }, 400)
      }

    // ── Fashion (vision) ─────────────────────────────────────────────
    } else if (category === 'fashion') {
      const file = form.get('file') as File
      if (!file || file.size === 0) return c.json({ error: 'Please upload an image.' }, 400)
      if (file.size > 20 * 1024 * 1024) return c.json({ error: 'Image too large. Max 20 MB.' }, 400)

      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const mimeType = (validTypes.includes(file.type) ? file.type : 'image/jpeg') as
        'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      messages = [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: `You are a fashion stylist. Analyze the clothing or outfit in this image and recommend 5 similar styles, pieces, or looks. Consider aesthetic, color palette, formality, and overall vibe. Include a realistic price range for each item.

Return ONLY valid JSON:
{
  "detected": { "title": "brief description of what you see", "creator": "brand if identifiable, or empty string" },
  "recommendations": [
    { "title": "piece or look name", "creator": "brand or style name", "year": "", "reason": "One specific sentence about why this fits.", "price_range": "e.g. $40–120 or Under $50" }
  ]
}` }
        ]
      }]

    // ── Text-based: book / tv / film ─────────────────────────────────
    } else {
      const title   = (form.get('title')   as string || '').trim()
      const creator = (form.get('creator') as string || '').trim()
      if (!title) return c.json({ error: 'Please enter a title.' }, 400)

      const prompts: Record<string, string> = {
        book: `You are a literary expert. Recommend 5 books similar to "${title}"${creator ? ' by ' + creator : ''}. Consider genre, themes, writing style, and tone. Vary the picks.`,
        tv:   `You are a TV critic. Recommend 5 shows similar to "${title}"${creator ? ' created by ' + creator : ''}. Consider genre, tone, pacing, and themes. Vary the picks.`,
        film: `You are a film critic. Recommend 5 films similar to "${title}"${creator ? ' directed by ' + creator : ''}. Consider genre, style, and themes. Vary the picks.`,
      }

      const creatorLabels: Record<string, string> = { book: 'author', tv: 'creator', film: 'director' }

      messages = [{ role: 'user', content: `${prompts[category]}

Return ONLY valid JSON:
{
  "detected": { "title": "${title.replace(/"/g, '\\"')}", "creator": "${creator.replace(/"/g, '\\"')}" },
  "recommendations": [
    { "title": "...", "creator": "${creatorLabels[category]} name", "year": "...", "reason": "One specific sentence." }
  ]
}` }]
    }

    const msg = await ai.messages.create({
      model: 'anthropic-claude-bedrock4.5-haiku',
      max_tokens: 1500,
      messages,
    })

    const raw     = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonStr) throw new Error('Could not parse response')

    return c.json({ ...JSON.parse(jsonStr), category })

  } catch (err: any) {
    console.error(err)
    return c.json({ error: err.message || 'Something went wrong.' }, 500)
  }
})

export default { port: process.env.PORT || 3000, fetch: app.fetch }
