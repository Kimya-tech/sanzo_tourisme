// Ajoute des photos de DÉMONSTRATION (illustrations abstraites générées) aux sites fictifs du seed.
// Environnement LOCAL uniquement : utilise la clé secrète locale de « supabase status », jamais exposée
// au navigateur ni utilisée en production.
//
//   node scripts/demo-photos.mjs     (exécuté automatiquement par « npm run db:reset »)

import { execSync } from 'node:child_process'
import { crc32, deflateSync } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'site-photos'
const DEMO_FOLDER = '00000000-0000-0000-0000-000000000000'

function localSupabase() {
  const output = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  const env = Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  )
  const url = env.API_URL
  const key = env.SECRET_KEY || env.SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase local introuvable : lancez « npm run db:start ».')
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) {
    throw new Error(`Ce script ne s'exécute que sur Supabase local (URL : ${url}).`)
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

// ---------------------------------------------------------------------------
// Encodeur PNG minimal (RVB 8 bits)
// ---------------------------------------------------------------------------
function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x / width, y / height)
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Paysage abstrait : ciel en dégradé, soleil, deux lignes de collines.
const mix = (a, b, t) => a.map((value, i) => Math.round(value + (b[i] - value) * t))
const PALETTES = [
  { skyTop: [56, 120, 190], skyLow: [250, 205, 150], sun: [255, 236, 170], far: [92, 140, 96], near: [44, 96, 52] },
  { skyTop: [120, 70, 140], skyLow: [250, 170, 120], sun: [255, 220, 160], far: [130, 110, 80], near: [80, 60, 40] },
  { skyTop: [70, 150, 170], skyLow: [210, 235, 220], sun: [255, 250, 220], far: [60, 130, 110], near: [30, 90, 70] },
  { skyTop: [200, 110, 60], skyLow: [250, 210, 140], sun: [255, 245, 200], far: [150, 100, 60], near: [110, 60, 30] },
]

function landscape(seed) {
  const p = PALETTES[seed % PALETTES.length]
  const phase = seed * 1.7
  const sunX = 0.25 + ((seed * 0.37) % 0.5)
  return (x, y) => {
    const far = 0.55 + 0.06 * Math.sin(x * 7 + phase) + 0.03 * Math.sin(x * 17 + phase * 2)
    const near = 0.72 + 0.07 * Math.sin(x * 4 + phase * 0.5) + 0.02 * Math.sin(x * 23 + phase)
    if (y > near) return mix(p.near, [20, 40, 20], (y - near) * 1.5)
    if (y > far) return mix(p.far, p.near, (y - far) / (near - far) * 0.6)
    const d = Math.hypot((x - sunX) * 1.6, y - 0.32)
    if (d < 0.08) return p.sun
    const sky = mix(p.skyTop, p.skyLow, y / far)
    return d < 0.16 ? mix(p.sun, sky, (d - 0.08) / 0.08) : sky
  }
}

// ---------------------------------------------------------------------------
async function main() {
  const supabase = localSupabase()
  const { data: sites, error } = await supabase
    .from('sites')
    .select('id, name, site_photos(count)')
    .like('name', '[D_MO]%')
    .order('sort_order')
  if (error) throw error

  let added = 0
  for (const [siteIndex, site] of sites.entries()) {
    if ((site.site_photos[0]?.count ?? 0) > 0) continue
    const photoCount = siteIndex === 0 ? 3 : 2
    for (let n = 1; n <= photoCount; n++) {
      const seed = siteIndex * 3 + n
      const base = `${DEMO_FOLDER}/${site.id}/demo-${n}`
      const full = encodePng(1600, 1000, landscape(seed))
      const thumb = encodePng(480, 300, landscape(seed))
      for (const [path, body] of [
        [`${base}.png`, full],
        [`${base}-thumb.png`, thumb],
      ]) {
        const upload = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/png', upsert: true })
        if (upload.error) throw upload.error
      }
      const insert = await supabase.from('site_photos').insert({
        site_id: site.id,
        storage_path: `${base}.png`,
        thumb_path: `${base}-thumb.png`,
        caption: `[DÉMO] Illustration fictive ${n}`,
        width: 1600,
        height: 1000,
        sort_order: n,
      })
      if (insert.error) throw insert.error
      added++
    }
  }
  console.log(`Photos de démonstration ajoutées : ${added}`)
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exit(1)
})
