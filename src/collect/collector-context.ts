import { createContext, use } from 'react'
import type { ErrorKey } from '../lib/errors'

export type CollectorState =
  | { status: 'loading' }
  | { status: 'onboarding' }
  | { status: 'disabled' }
  | { status: 'error' }
  | { status: 'ready'; userId: string; name: string }

export interface CollectorContextValue {
  state: CollectorState
  /** Retourne une clé d'erreur, ou null si l'enregistrement a réussi. */
  register: (name: string, code: string) => Promise<ErrorKey | null>
  rename: (name: string) => Promise<ErrorKey | null>
  retry: () => void
}

export const CollectorContext = createContext<CollectorContextValue | null>(null)

export function useCollector(): CollectorContextValue {
  const value = use(CollectorContext)
  if (!value) throw new Error('useCollector doit être utilisé dans <CollectorProvider>.')
  return value
}

export function useReadyCollector(): { userId: string; name: string } {
  const { state } = useCollector()
  if (state.status !== 'ready') throw new Error('Collecteur non enregistré.')
  return state
}

// Code d'accès transmis dans le lien de collecte : …/collecte#code=XXXX
const CODE_KEY = 'tourisme-sanzo.collect.code'

export function captureCodeFromHash(): void {
  const match = /(?:^#|&)code=([^&]+)/.exec(window.location.hash)
  if (!match?.[1]) return
  try {
    sessionStorage.setItem(CODE_KEY, decodeURIComponent(match[1]))
  } catch {
    // Ignoré : le code sera demandé.
  }
  // Retire le code de la barre d'adresse (captures d'écran, partage involontaire).
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
}

export function storedCode(): string {
  try {
    return sessionStorage.getItem(CODE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function forgetCode(): void {
  try {
    sessionStorage.removeItem(CODE_KEY)
  } catch {
    // Ignoré.
  }
}
