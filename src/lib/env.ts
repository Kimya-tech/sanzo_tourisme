export interface PublicEnv {
  supabaseUrl: string
  supabasePublishableKey: string
}

type RawEnv = Record<string, string | boolean | undefined>

// Clé secrète Supabase : nouvelle clé « sb_secret_… » ou ancien JWT avec le rôle service_role.
export function isSecretSupabaseKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  const payload = key.split('.')[1]
  if (!payload) return false
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { role?: unknown }).role === 'service_role'
  } catch {
    return false
  }
}

export function readPublicEnv(raw: RawEnv): PublicEnv {
  const url = typeof raw.VITE_SUPABASE_URL === 'string' ? raw.VITE_SUPABASE_URL.trim() : ''
  const keyValue = raw.VITE_SUPABASE_PUBLISHABLE_KEY ?? raw.VITE_SUPABASE_ANON_KEY
  const key = typeof keyValue === 'string' ? keyValue.trim() : ''

  if (!url || !key) {
    throw new Error(
      'Configuration manquante : définissez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY (voir .env.example).',
    )
  }
  try {
    new URL(url)
  } catch {
    throw new Error('VITE_SUPABASE_URL doit être une URL valide.')
  }
  if (isSecretSupabaseKey(key)) {
    throw new Error('Une clé secrète Supabase ne doit jamais être utilisée dans le navigateur.')
  }
  return { supabaseUrl: url, supabasePublishableKey: key }
}
