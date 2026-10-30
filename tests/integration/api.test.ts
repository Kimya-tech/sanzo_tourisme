// Tests d'intégration contre l'API Supabase LOCALE (Auth anonyme, PostgREST, Storage).
// Prérequis : « npm run db:start » puis « npm run db:reset » (code de collecte de démonstration du seed).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../src/lib/database.types'

const env = loadEnv('development', process.cwd(), 'VITE_')
const url = env.VITE_SUPABASE_URL ?? ''
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? ''
const DEMO_CODE = 'SANZO-DEMO-2026'

if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) {
  throw new Error(`Les tests d'intégration ne s'exécutent que sur Supabase local (URL reçue : « ${url} »).`)
}

type Client = SupabaseClient<Database>

function newClient(): Client {
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function anonymousSession(): Promise<{ client: Client; userId: string }> {
  const client = newClient()
  const { data, error } = await client.auth.signInAnonymously()
  if (error || !data.user) throw new Error(`Session anonyme impossible : ${error?.message}`)
  return { client, userId: data.user.id }
}

const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9])], { type: 'image/jpeg' })

const siteRow = {
  name: 'Site de test d’intégration',
  description: 'Site fictif créé par les tests d’intégration.',
  collected_on: '2026-10-29',
  collector_name: 'Testeur',
  language: 'fr',
  latitude: 5.29,
  longitude: 9.97,
}

describe('API Supabase locale', () => {
  const anon = newClient()
  let alice: { client: Client; userId: string }
  let bob: { client: Client; userId: string }
  let siteId: string | null = null
  let photoPath: string | null = null

  beforeAll(async () => {
    alice = await anonymousSession()
    bob = await anonymousSession()
  })

  afterAll(async () => {
    if (photoPath) await alice.client.storage.from('site-photos').remove([photoPath])
    if (siteId) await alice.client.from('sites').delete().eq('id', siteId)
  })

  describe('visiteur', () => {
    it('lit la story map', async () => {
      const { data, error } = await anon.from('story_sites').select('id, name, photos')
      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThanOrEqual(4)
    })

    it('ne peut pas créer de site', async () => {
      const { error } = await anon.from('sites').insert(siteRow)
      expect(error?.code).toBe('42501')
    })

    it('ne lit ni les collecteurs ni les identifiants des auteurs', async () => {
      const collectors = await anon.from('collectors').select('user_id')
      expect(collectors.error?.code).toBe('42501')
      const authors = await anon.from('sites').select('created_by')
      expect(authors.error?.code).toBe('42501')
    })

    it('ne peut pas créer de compte par e-mail', async () => {
      const { error } = await newClient().auth.signUp({ email: `x-${Date.now()}@example.com`, password: 'Motdepasse2026' })
      expect(error).not.toBeNull()
    })
  })

  describe('session anonyme sans code', () => {
    it('ne peut ni créer de site ni déposer de photo', async () => {
      const insert = await bob.client.from('sites').insert(siteRow)
      expect(insert.error?.code).toBe('42501')
      const upload = await bob.client.storage
        .from('site-photos')
        .upload(`${bob.userId}/00000000-0000-0000-0000-000000000000/x.jpg`, jpeg(), { contentType: 'image/jpeg' })
      expect(upload.error).not.toBeNull()
    })

    it('un code erroné est refusé', async () => {
      const { data, error } = await bob.client.rpc('register_collector', { p_code: 'mauvais', p_display_name: 'Bob' })
      expect(error).toBeNull()
      expect(data).toBe(false)
    })
  })

  describe('collecteur', () => {
    it('s’enregistre avec le code du lien et son nom', async () => {
      const { data, error } = await alice.client.rpc('register_collector', { p_code: DEMO_CODE, p_display_name: 'Alice' })
      expect(error).toBeNull()
      expect(data).toBe(true)
    })

    it('crée un site visible immédiatement dans la story map', async () => {
      const { data, error } = await alice.client.from('sites').insert(siteRow).select('id').single()
      expect(error).toBeNull()
      siteId = data!.id
      const { data: story } = await anon.from('story_sites').select('name, collector_name').eq('id', siteId).single()
      expect(story).toEqual({ name: siteRow.name, collector_name: 'Testeur' })
    })

    it('ajoute une photo publique', async () => {
      photoPath = `${alice.userId}/${siteId}/photo-test.jpg`
      const upload = await alice.client.storage
        .from('site-photos')
        .upload(photoPath, jpeg(), { contentType: 'image/jpeg' })
      expect(upload.error).toBeNull()
      const row = await alice.client
        .from('site_photos')
        .insert({ site_id: siteId!, storage_path: photoPath, caption: 'Test', width: 1, height: 1 })
      expect(row.error).toBeNull()

      const { data: story } = await anon.from('story_sites').select('photos').eq('id', siteId!).single()
      expect(story?.photos).toEqual([{ id: expect.any(String), path: photoPath, thumb: null, caption: 'Test', width: 1, height: 1 }])
      const publicUrl = anon.storage.from('site-photos').getPublicUrl(photoPath).data.publicUrl
      expect((await fetch(publicUrl)).status).toBe(200)
    })

    it('ne peut pas écraser une photo existante', async () => {
      const { error } = await alice.client.storage
        .from('site-photos')
        .upload(photoPath!, jpeg(), { contentType: 'image/jpeg', upsert: true })
      expect(error).not.toBeNull()
    })

    it('refuse les fichiers non image', async () => {
      const { error } = await alice.client.storage
        .from('site-photos')
        .upload(`${alice.userId}/${siteId}/script.svg`, new Blob(['<svg/>'], { type: 'image/svg+xml' }), {
          contentType: 'image/svg+xml',
        })
      expect(error).not.toBeNull()
    })
  })

  describe('isolation entre collecteurs', () => {
    beforeAll(async () => {
      await bob.client.rpc('register_collector', { p_code: DEMO_CODE, p_display_name: 'Bob' })
    })

    it('un autre collecteur ne peut ni modifier ni supprimer le site', async () => {
      await bob.client.from('sites').update({ name: 'Piraté' }).eq('id', siteId!)
      await bob.client.from('sites').delete().eq('id', siteId!)
      const { data } = await anon.from('story_sites').select('name').eq('id', siteId!).single()
      expect(data?.name).toBe(siteRow.name)
    })

    it('un autre collecteur ne peut pas ajouter de photo au site', async () => {
      const { error } = await bob.client.storage
        .from('site-photos')
        .upload(`${bob.userId}/${siteId}/intrus.jpg`, jpeg(), { contentType: 'image/jpeg' })
      expect(error).not.toBeNull()
    })

    it('un autre collecteur ne peut pas supprimer la photo', async () => {
      await bob.client.storage.from('site-photos').remove([photoPath!])
      const publicUrl = anon.storage.from('site-photos').getPublicUrl(photoPath!).data.publicUrl
      expect((await fetch(publicUrl)).status).toBe(200)
    })
  })
})
