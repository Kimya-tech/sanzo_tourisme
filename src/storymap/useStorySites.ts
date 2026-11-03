import { useCallback, useEffect, useState } from 'react'
import { isLanguage, type Language } from '../i18n/languages'
import { isCategory, type Category } from '../lib/categories'
import type { Database } from '../lib/database.types'
import { supabase } from '../lib/supabase'

type StorySiteRow = Database['public']['Views']['story_sites']['Row']

export interface StoryPhoto {
  id: string
  path: string
  thumb: string | null
  caption: string | null
  width: number | null
  height: number | null
}

export interface StorySite {
  id: string
  name: string
  description: string
  collectedOn: string
  collectorName: string
  language: Language
  category: Category | null
  latitude: number
  longitude: number
  photos: StoryPhoto[]
}

function toPhotos(value: unknown): StoryPhoto[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const photo = item as Record<string, unknown>
    if (typeof photo.id !== 'string' || typeof photo.path !== 'string') return []
    return [
      {
        id: photo.id,
        path: photo.path,
        thumb: typeof photo.thumb === 'string' ? photo.thumb : null,
        caption: typeof photo.caption === 'string' && photo.caption.trim() ? photo.caption : null,
        width: typeof photo.width === 'number' ? photo.width : null,
        height: typeof photo.height === 'number' ? photo.height : null,
      },
    ]
  })
}

export function toStorySite(row: StorySiteRow): StorySite | null {
  if (!row.id || !row.name || !row.description || row.latitude == null || row.longitude == null) return null
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    collectedOn: row.collected_on ?? '',
    collectorName: row.collector_name ?? '',
    language: isLanguage(row.language) ? row.language : 'fr',
    category: isCategory(row.category) ? row.category : null,
    latitude: row.latitude,
    longitude: row.longitude,
    photos: toPhotos(row.photos),
  }
}

type State =
  | { status: 'loading'; sites: StorySite[] }
  | { status: 'ready'; sites: StorySite[] }
  | { status: 'error'; sites: StorySite[] }

export function useStorySites() {
  const [state, setState] = useState<State>({ status: 'loading', sites: [] })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void supabase
      .from('story_sites')
      .select('*')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setState({ status: 'error', sites: [] })
          return
        }
        const sites = (data ?? []).map(toStorySite).filter((site): site is StorySite => site !== null)
        setState({ status: 'ready', sites })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const reload = useCallback(() => {
    setState({ status: 'loading', sites: [] })
    setAttempt((value) => value + 1)
  }, [])

  return { ...state, reload }
}
