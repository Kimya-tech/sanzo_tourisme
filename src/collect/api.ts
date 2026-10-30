import type { Language } from '../i18n/languages'
import { PHOTO_BUCKET, supabase } from '../lib/supabase'
import type { PreparedPhoto } from './photos'

export interface SiteInput {
  name: string
  description: string
  collectedOn: string
  collectorName: string
  language: Language
  latitude: number
  longitude: number
  accuracy: number | null
}

export interface MySite {
  id: string
  name: string
  collectedOn: string
  isPublished: boolean
  photoCount: number
  latitude: number
  longitude: number
}

export interface SitePoint {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface ExistingPhoto {
  id: string
  path: string
  thumbPath: string | null
  caption: string | null
}

const filesOf = (photo: ExistingPhoto) => (photo.thumbPath ? [photo.path, photo.thumbPath] : [photo.path])

export interface EditableSite extends Omit<SiteInput, 'language'> {
  id: string
  language: string
  photos: ExistingPhoto[]
}

function toRow(input: SiteInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    collected_on: input.collectedOn,
    collector_name: input.collectorName.trim(),
    language: input.language,
    latitude: input.latitude,
    longitude: input.longitude,
    location_accuracy_m: input.accuracy === null ? null : Math.round(input.accuracy * 100) / 100,
  }
}

export async function listMySites(userId: string): Promise<MySite[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, collected_on, is_published, latitude, longitude, site_photos(count)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    collectedOn: row.collected_on,
    isPublished: row.is_published,
    photoCount: row.site_photos[0]?.count ?? 0,
    latitude: row.latitude,
    longitude: row.longitude,
  }))
}

// Sites publiés par l'ensemble des collecteurs : affichés pour éviter les doublons.
export async function listPublishedSites(): Promise<SitePoint[]> {
  const { data, error } = await supabase.from('story_sites').select('id, name, latitude, longitude')
  if (error) throw error
  return data.flatMap((row) =>
    row.id && row.name && row.latitude != null && row.longitude != null
      ? [{ id: row.id, name: row.name, latitude: row.latitude, longitude: row.longitude }]
      : [],
  )
}

export async function getMySite(id: string): Promise<EditableSite | null> {
  const { data, error } = await supabase
    .from('sites')
    .select(
      'id, name, description, collected_on, collector_name, language, latitude, longitude, location_accuracy_m, site_photos(id, storage_path, thumb_path, caption, sort_order)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    collectedOn: data.collected_on,
    collectorName: data.collector_name,
    language: data.language,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.location_accuracy_m,
    photos: [...data.site_photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => ({
        id: photo.id,
        path: photo.storage_path,
        thumbPath: photo.thumb_path,
        caption: photo.caption,
      })),
  }
}

export async function createSite(input: SiteInput): Promise<string> {
  const { data, error } = await supabase.from('sites').insert(toRow(input)).select('id').single()
  if (error) throw error
  return data.id
}

export async function updateSite(id: string, input: SiteInput): Promise<void> {
  const { error } = await supabase.from('sites').update(toRow(input)).eq('id', id)
  if (error) throw error
}

export async function uploadPhoto(
  userId: string,
  siteId: string,
  photo: PreparedPhoto,
  caption: string,
  sortOrder: number,
): Promise<void> {
  const base = `${userId}/${siteId}/${crypto.randomUUID()}`
  const path = `${base}.jpg`
  const thumbPath = `${base}-thumb.jpg`
  const uploaded: string[] = []
  const options = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }
  try {
    for (const [target, image] of [
      [path, photo.full],
      [thumbPath, photo.thumb],
    ] as const) {
      const upload = await supabase.storage.from(PHOTO_BUCKET).upload(target, image.blob, options)
      if (upload.error) throw upload.error
      uploaded.push(target)
    }
    const { error } = await supabase.from('site_photos').insert({
      site_id: siteId,
      storage_path: path,
      thumb_path: thumbPath,
      caption: caption.trim() || null,
      width: photo.full.width,
      height: photo.full.height,
      sort_order: sortOrder,
    })
    if (error) throw error
  } catch (error) {
    if (uploaded.length > 0) await supabase.storage.from(PHOTO_BUCKET).remove(uploaded)
    throw error
  }
}

export async function deletePhoto(photo: ExistingPhoto): Promise<void> {
  const { error } = await supabase.from('site_photos').delete().eq('id', photo.id)
  if (error) throw error
  await supabase.storage.from(PHOTO_BUCKET).remove(filesOf(photo))
}

export async function deleteSite(site: Pick<EditableSite, 'id' | 'photos'>): Promise<void> {
  const { error } = await supabase.from('sites').delete().eq('id', site.id)
  if (error) throw error
  if (site.photos.length > 0) {
    await supabase.storage.from(PHOTO_BUCKET).remove(site.photos.flatMap(filesOf))
  }
}
