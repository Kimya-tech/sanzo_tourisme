import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { errorKey, type ErrorKey } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { CollectorContext, forgetCode, type CollectorContextValue, type CollectorState } from './collector-context'

async function loadCollector(): Promise<CollectorState> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return { status: 'onboarding' }
  const { data, error } = await supabase.rpc('my_collector').maybeSingle()
  if (error) return { status: 'error' }
  if (!data) return { status: 'onboarding' }
  if (!data.is_active) return { status: 'disabled' }
  return { status: 'ready', userId, name: data.display_name }
}

// Session refusée par le serveur (utilisateur supprimé, session révoquée…), à remplacer par une nouvelle.
function isInvalidSession(error: { code?: string; status?: number }): boolean {
  return (
    error.code === 'user_not_found' ||
    error.code === 'session_not_found' ||
    error.code === 'bad_jwt' ||
    error.status === 401 ||
    error.status === 403
  )
}

// Retourne l'identifiant d'une session anonyme valide, en créant une nouvelle session si nécessaire.
async function ensureAnonymousSession(): Promise<{ userId: string } | { error: ErrorKey }> {
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session) {
    // La session locale peut être périmée : on la vérifie auprès du serveur.
    const { data, error } = await supabase.auth.getUser()
    if (!error && data.user) return { userId: data.user.id }
    if (error && !isInvalidSession(error)) return { error: errorKey(error) }
    await supabase.auth.signOut({ scope: 'local' })
  }
  // Session anonyme : aucun e-mail ni mot de passe, conservée sur l'appareil.
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) return { error: errorKey(error) }
  return { userId: data.user.id }
}

export function CollectorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CollectorState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void loadCollector().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  const register = useCallback(async (name: string, code: string): Promise<ErrorKey | null> => {
    const session = await ensureAnonymousSession()
    if ('error' in session) return session.error
    const { data: accepted, error } = await supabase.rpc('register_collector', {
      p_code: code,
      p_display_name: name,
    })
    if (error) {
      if (error.message === 'collector_disabled') setState({ status: 'disabled' })
      return errorKey(error)
    }
    if (!accepted) return 'errors.invalidCode'
    forgetCode()
    setState({ status: 'ready', userId: session.userId, name: name.trim() })
    return null
  }, [])

  const rename = useCallback(
    async (name: string): Promise<ErrorKey | null> => {
      if (state.status !== 'ready') return 'errors.generic'
      const trimmed = name.trim()
      if (trimmed.length < 2 || trimmed.length > 80) return 'errors.invalidName'
      const { error } = await supabase
        .from('collectors')
        .update({ display_name: trimmed })
        .eq('user_id', state.userId)
      if (error) return errorKey(error)
      setState({ ...state, name: trimmed })
      return null
    },
    [state],
  )

  const value = useMemo<CollectorContextValue>(
    () => ({ state, register, rename, retry }),
    [register, rename, retry, state],
  )
  return <CollectorContext value={value}>{children}</CollectorContext>
}
