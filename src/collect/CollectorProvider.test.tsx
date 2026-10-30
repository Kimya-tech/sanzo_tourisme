import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCollector } from './collector-context'
import { CollectorProvider } from './CollectorProvider'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  signInAnonymously: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      signOut: mocks.signOut,
      signInAnonymously: mocks.signInAnonymously,
    },
    rpc: mocks.rpc,
  },
}))

const STALE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const FRESH = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function Probe() {
  const { state, register } = useCollector()
  return (
    <div>
      <p data-testid="status">{state.status === 'ready' ? `ready:${state.userId}` : state.status}</p>
      <button type="button" onClick={() => void register('Jules', 'SANZO-DEMO-2026').then((r) => (document.title = r ?? 'ok'))}>
        register
      </button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  document.title = ''
  // Session locale présente (ex. créée avant une réinitialisation de la base).
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: STALE } } } })
  mocks.signOut.mockResolvedValue({ error: null })
  mocks.signInAnonymously.mockResolvedValue({ data: { user: { id: FRESH }, session: {} }, error: null })
  mocks.rpc.mockImplementation((fn: string) =>
    fn === 'my_collector'
      ? { maybeSingle: () => Promise.resolve({ data: null, error: null }) }
      : Promise.resolve({ data: true, error: null }),
  )
})

describe('CollectorProvider', () => {
  it('remplace une session périmée (utilisateur supprimé) par une nouvelle session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'user_not_found', status: 403 } })
    render(
      <CollectorProvider>
        <Probe />
      </CollectorProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('onboarding'))
    await act(async () => screen.getByRole('button', { name: 'register' }).click())
    await waitFor(() => expect(document.title).toBe('ok'))
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(mocks.signInAnonymously).toHaveBeenCalledTimes(1)
    expect(mocks.rpc).toHaveBeenCalledWith('register_collector', { p_code: 'SANZO-DEMO-2026', p_display_name: 'Jules' })
    expect(screen.getByTestId('status')).toHaveTextContent(`ready:${FRESH}`)
  })

  it('réutilise une session encore valide', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: STALE } }, error: null })
    render(
      <CollectorProvider>
        <Probe />
      </CollectorProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('onboarding'))
    await act(async () => screen.getByRole('button', { name: 'register' }).click())
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent(`ready:${STALE}`))
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.signInAnonymously).not.toHaveBeenCalled()
  })

  it('ne jette pas la session en cas de coupure réseau', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 },
    })
    render(
      <CollectorProvider>
        <Probe />
      </CollectorProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('onboarding'))
    await act(async () => screen.getByRole('button', { name: 'register' }).click())
    await waitFor(() => expect(document.title).toBe('errors.network'))
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalledWith('register_collector', expect.anything())
  })
})
