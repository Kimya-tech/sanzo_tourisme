import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { readPublicEnv } from './env'

const env = readPublicEnv(import.meta.env)

export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

export const PHOTO_BUCKET = 'site-photos'

export function photoUrl(storagePath: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath).data.publicUrl
}