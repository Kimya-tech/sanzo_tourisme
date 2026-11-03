// Copie un site publié (texte + photos + miniatures) de Supabase LOCAL vers le projet Supabase EN LIGNE.
// Passe par le même chemin que l'application de collecte : clé publique + code de collecte, jamais de clé secrète.
//
//   $env:TARGET_SUPABASE_URL = "https://<ref>.supabase.co"
//   $env:TARGET_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_…"
//   $env:COLLECT_CODE = "<code créé par private.create_collect_invite>"
//   node scripts/transfer-site.mjs "Nom exact du site"
//
// Source : VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY de .env.local (Supabase local démarré).
// Le site est ignoré s'il existe déjà en ligne sous le même nom. En cas d'échec, rien n'est laissé en ligne.

import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'site-photos'
const options = { auth: { persistSession: false, autoRefreshToken: false } }

function fail(message) {
  console.error(`Erreur : ${message}`)
  process.exit(1)
}

const siteName = process.argv[2]?.trim()
if (!siteName) fail('indiquez le nom exact du site, par exemple : node scripts/transfer-site.mjs "Eleu Ngoueu"')

const local = parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8'))
const sourceUrl = local.VITE_SUPABASE_URL
const sourceKey = local.VITE_SUPABASE_PUBLISHABLE_KEY || local.VITE_SUPABASE_ANON_KEY
const { TARGET_SUPABASE_URL: targetUrl, TARGET_SUPABASE_PUBLISHABLE_KEY: targetKey, COLLECT_CODE: code } = process.env

if (!sourceUrl || !sourceKey) fail('.env.local doit contenir VITE_SUPABASE_URL et la clé publique locale.')
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(sourceUrl)) fail(`la source doit être Supabase local (${sourceUrl}).`)
if (!targetUrl || !targetKey || !code) {
  fail('définissez TARGET_SUPABASE_URL, TARGET_SUPABASE_PUBLISHABLE_KEY et COLLECT_CODE.')
}
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(targetUrl)) fail(`URL cible inattendue : ${targetUrl}`)
if (targetKey.startsWith('sb_secret_')) fail('utilisez la clé publique (sb_publishable_…), jamais la clé secrète.')

const source = createClient(sourceUrl, sourceKey, options)
const target = createClient(targetUrl.replace(/\/$/, ''), targetKey, options)

const { data: found, error: readError } = await source.from('story_sites').select('*').eq('name', siteName)
if (readError) fail(`lecture locale impossible (${readError.message}). Supabase local est-il démarré ?`)
if (found.length !== 1) fail(`${found.length} site(s) publié(s) nommé(s) « ${siteName} » en local (1 attendu).`)
const site = found[0]

const { data: existing, error: existingError } = await target.from('story_sites').select('id').eq('name', siteName)
if (existingError) fail(`lecture en ligne impossible (${existingError.message}).`)
if (existing.length > 0) {
  console.log(`« ${siteName} » existe déjà en ligne : rien à faire.`)
  process.exit(0)
}

const { data: auth, error: authError } = await target.auth.signInAnonymously()
if (authError) fail(`connexion anonyme refusée (${authError.message}). « Allow anonymous sign-ins » est-il activé ?`)
const userId = auth.user.id

const { data: accepted, error: registerError } = await target.rpc('register_collector', {
  p_code: code,
  p_display_name: site.collector_name,
})
if (registerError) fail(`enregistrement du collecteur refusé (${registerError.message}).`)
if (!accepted) fail('code de collecte invalide ou désactivé.')

async function download(path) {
  const response = await fetch(source.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
  if (!response.ok) throw new Error(`téléchargement local de ${path} : HTTP ${response.status}`)
  return response.blob()
}

const uploaded = []
let siteId = null
try {
  const { data: created, error: insertError } = await target
    .from('sites')
    .insert({
      name: site.name,
      category: site.category ?? null,
      description: site.description,
      collected_on: site.collected_on,
      collector_name: site.collector_name,
      language: site.language,
      latitude: site.latitude,
      longitude: site.longitude,
    })
    .select('id')
    .single()
  if (insertError) throw new Error(`création du site : ${insertError.message}`)
  siteId = created.id

  for (const [index, photo] of site.photos.entries()) {
    // Conserve le format d'origine (les photos de démonstration sont en PNG).
    const ext = /\.(jpe?g|png|webp)$/i.exec(photo.path)?.[1].toLowerCase().replace('jpeg', 'jpg') ?? 'jpg'
    const contentType = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext]
    const base = `${userId}/${siteId}/${randomUUID()}`
    const path = `${base}.${ext}`
    const thumbPath = photo.thumb ? `${base}-thumb.${ext}` : null
    for (const [from, to] of [[photo.path, path], [photo.thumb, thumbPath]]) {
      if (!from) continue
      const blob = await download(from)
      const { error } = await target.storage
        .from(BUCKET)
        .upload(to, blob, { contentType, cacheControl: '31536000', upsert: false })
      if (error) throw new Error(`envoi de ${to} : ${error.message}`)
      uploaded.push(to)
    }
    const { error: photoError } = await target.from('site_photos').insert({
      site_id: siteId,
      storage_path: path,
      thumb_path: thumbPath,
      caption: photo.caption,
      width: photo.width,
      height: photo.height,
      sort_order: index,
    })
    if (photoError) throw new Error(`enregistrement de la photo ${index + 1} : ${photoError.message}`)
    console.log(`  photo ${index + 1}/${site.photos.length} envoyée`)
  }
} catch (error) {
  if (uploaded.length > 0) await target.storage.from(BUCKET).remove(uploaded)
  if (siteId) await target.from('sites').delete().eq('id', siteId)
  fail(`${error.message} — transfert annulé, rien n'a été laissé en ligne.`)
}

console.log(`« ${site.name} » est en ligne avec ${site.photos.length} photo(s).`)
