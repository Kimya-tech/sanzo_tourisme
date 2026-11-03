import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rememberLanguage } from '../i18n/languages'
import type { StorySite } from '../storymap/useStorySites'
import { routes } from './router'

const LAC = '11111111-1111-1111-1111-111111111111'
const VILLAGE = '22222222-2222-2222-2222-222222222222'
const FORET = '33333333-3333-3333-3333-333333333333'

const storyRows = [
  {
    id: LAC,
    name: 'Lac fictif',
    description: 'Premier paragraphe.\n\nDeuxième paragraphe.\nTroisième paragraphe.',
    collected_on: '2026-10-03',
    collector_name: 'Alice',
    language: 'fr',
    latitude: 5.28,
    longitude: 9.98,
    updated_at: '',
    category: 'nature',
    photos: [
      { id: 'p1', path: 'u/s/photo-1.jpg', thumb: 'u/s/photo-1-thumb.jpg', caption: 'Vue du lac', width: 1600, height: 1200 },
      { id: 'p2', path: 'u/s/photo-2.jpg', thumb: null, caption: null, width: 1600, height: 1200 },
    ],
  },
  {
    id: VILLAGE,
    name: 'Village square',
    description: 'Written in English.',
    collected_on: '2026-10-04',
    collector_name: 'Bob',
    language: 'en',
    latitude: 5.27,
    longitude: 10.0,
    updated_at: '',
    category: 'village',
    photos: [],
  },
  {
    id: FORET,
    name: 'Forêt des singes',
    description: 'Sentiers et primates.',
    collected_on: '2026-10-05',
    collector_name: 'Carine',
    language: 'fr',
    latitude: 5.26,
    longitude: 9.97,
    updated_at: '',
    photos: [],
  },
]

const supabaseState = vi.hoisted(() => ({
  result: { data: [] as unknown[] | null, error: null as unknown },
  session: null as null | { user: { id: string } },
  collector: null as null | { display_name: string; is_active: boolean },
}))

vi.mock('../lib/supabase', () => {
  // Requête factice chaînable (select().eq().order()…), résolue avec le résultat prévu.
  const query = (result: () => unknown) => {
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order']) chain[method] = () => chain
    chain.maybeSingle = () => Promise.resolve(result())
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject)
    return chain
  }
  return {
    supabase: {
      from: (table: string) =>
        query(() => (table === 'story_sites' ? supabaseState.result : { data: [], error: null })),
      rpc: () => query(() => ({ data: supabaseState.collector, error: null })),
      auth: { getSession: () => Promise.resolve({ data: { session: supabaseState.session } }) },
    },
    photoUrl: (path: string) => `https://cdn.test/${path}`,
    PHOTO_BUCKET: 'site-photos',
  }
})

// Leaflet n'est pas exécutable dans jsdom : les cartes sont remplacées par des éléments simples.
vi.mock('../storymap/SiteMap', () => ({
  SiteMap: ({
    sites,
    activeId,
    hoveredId,
    onSelect,
  }: {
    sites: StorySite[]
    activeId: string | null
    hoveredId: string | null
    onSelect: (id: string) => void
  }) => (
    <div data-testid="map" data-active={activeId ?? ''} data-hovered={hoveredId ?? ''}>
      {sites.map((site) => (
        <button key={site.id} type="button" onClick={() => onSelect(site.id)}>
          repère {site.name}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('../collect/CollectMap', () => ({
  CollectMap: () => <div data-testid="collect-map" />,
}))
vi.mock('../collect/LocationPicker', () => ({
  LocationPicker: () => <div data-testid="location-picker" />,
}))

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

const thumbnails = () => within(screen.getByRole('navigation', { name: 'Sites touristiques' }))
const panel = () => screen.queryByRole('complementary', { name: 'Détails du site' })
const welcome = () => screen.queryByRole('complementary', { name: 'Bienvenue à Sanzo' })

beforeEach(() => {
  supabaseState.result = { data: storyRows, error: null }
  supabaseState.session = null
  supabaseState.collector = null
  sessionStorage.removeItem('tourisme-sanzo.welcome-closed')
})

describe('plateforme', () => {
  it('redirige la racine vers la langue préférée et affiche les miniatures des sites', async () => {
    rememberLanguage('fr')
    const router = renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Découvrez Sanzo autrement' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/fr')
    await screen.findByRole('button', { name: 'Lac fictif' })
    expect(thumbnails().getAllByRole('button')).toHaveLength(3)
    expect(thumbnails().getByRole('button', { name: 'Village square' })).toBeInTheDocument()
    expect(thumbnails().getByRole('button', { name: 'Forêt des singes' })).toHaveTextContent('Pas encore de photo')
    expect(thumbnails().getByText('3 sites')).toBeInTheDocument()
    expect(panel()).not.toBeInTheDocument()
  })

  it('utilise la miniature de la photo principale', async () => {
    renderAt('/fr')
    const button = await screen.findByRole('button', { name: 'Lac fictif' })
    expect(button.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/u/s/photo-1-thumb.jpg')
  })

  it('un clic sur une miniature ouvre les détails et centre la carte sur le site', async () => {
    const router = renderAt('/fr')
    fireEvent.click(await screen.findByRole('button', { name: 'Lac fictif' }))
    const details = await screen.findByRole('complementary', { name: 'Détails du site' })
    expect(within(details).getByRole('heading', { level: 2, name: 'Lac fictif' })).toHaveFocus()
    expect(details).toHaveTextContent('Collecté par Alice le 3 octobre 2026')
    expect(screen.getByTestId('map')).toHaveAttribute('data-active', LAC)
    expect(router.state.location.search).toBe(`?site=${LAC}`)
    expect(screen.getByRole('button', { name: 'Lac fictif' })).toHaveAttribute('aria-current', 'true')
  })

  it('affiche la photo principale, puis le texte, puis une autre photo, puis le texte…', async () => {
    renderAt(`/fr?site=${LAC}`)
    const details = await screen.findByRole('complementary', { name: 'Détails du site' })
    const blocks = [...details.querySelector('.site-details__content')!.children].map((element) =>
      element.tagName === 'FIGURE' ? `photo:${element.querySelector('img')!.getAttribute('src')}` : `texte:${element.textContent}`,
    )
    expect(blocks).toEqual([
      'photo:https://cdn.test/u/s/photo-1.jpg',
      'texte:Premier paragraphe.',
      'photo:https://cdn.test/u/s/photo-2.jpg',
      'texte:Deuxième paragraphe.',
      'texte:Troisième paragraphe.',
    ])
    expect(within(details).getByRole('img', { name: 'Vue du lac' })).toBeInTheDocument()
    expect(within(details).getByRole('img', { name: 'Lac fictif, photo 2' })).toBeInTheDocument()
    expect(within(details).getAllByText('Photo : Alice')).toHaveLength(2)
  })

  it('propose « Aller vers ce site » à côté du titre, qui ouvre l’itinéraire dans Google Maps', async () => {
    renderAt(`/fr?site=${LAC}`)
    const details = await screen.findByRole('complementary', { name: 'Détails du site' })
    const link = within(details).getByRole('link', { name: /Aller vers ce site/ })
    expect(link).toHaveAccessibleName('Aller vers ce site (itinéraire dans Google Maps, nouvel onglet)')
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=5.280000%2C9.980000')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    // Le bouton suit directement le titre ; « Collecté par… » est déplacé en bas du panneau.
    const title = within(details).getByRole('heading', { level: 2, name: 'Lac fictif' })
    expect(title.nextElementSibling).toBe(link)
    const credit = within(details).getByText('Collecté par Alice le 3 octobre 2026')
    expect(credit.compareDocumentPosition(details.querySelector('.site-details__content')!)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    )
  })

  it('traduit le bouton d’itinéraire en anglais', async () => {
    renderAt(`/en?site=${VILLAGE}`)
    const details = await screen.findByRole('complementary', { name: 'Site details' })
    expect(within(details).getByRole('link', { name: /Get directions to this site/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=5.270000%2C10.000000',
    )
  })

  it('le survol d’une miniature met en évidence le site sur la carte', async () => {
    renderAt('/fr')
    const button = await screen.findByRole('button', { name: 'Village square' })
    fireEvent.mouseEnter(button)
    expect(screen.getByTestId('map')).toHaveAttribute('data-hovered', VILLAGE)
    fireEvent.mouseLeave(button)
    expect(screen.getByTestId('map')).toHaveAttribute('data-hovered', '')
  })

  it('un clic sur un repère de la carte ouvre aussi les détails', async () => {
    renderAt('/fr')
    fireEvent.click(await screen.findByRole('button', { name: 'repère Village square' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Village square' })).toBeInTheDocument()
  })

  it('ferme les détails avec le bouton ou la touche Échap', async () => {
    const router = renderAt(`/fr?site=${LAC}`)
    await screen.findByRole('complementary', { name: 'Détails du site' })
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(panel()).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('')
    expect(screen.getByTestId('map')).toHaveAttribute('data-active', '')

    fireEvent.click(screen.getByRole('button', { name: 'Village square' }))
    await screen.findByRole('complementary', { name: 'Détails du site' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(panel()).not.toBeInTheDocument()
  })

  it('passe au site précédent ou suivant', async () => {
    renderAt(`/fr?site=${VILLAGE}`)
    const details = await screen.findByRole('complementary', { name: 'Détails du site' })
    fireEvent.click(within(details).getByRole('button', { name: 'Site suivant' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Forêt des singes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Site suivant' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Site précédent' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Site précédent' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Lac fictif' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Site précédent' })).not.toBeInTheDocument()
  })

  it('signale un récit rédigé dans une autre langue, sans le traduire', async () => {
    renderAt(`/fr?site=${VILLAGE}`)
    const details = await screen.findByRole('complementary', { name: 'Détails du site' })
    expect(details).toHaveTextContent('Récit rédigé en anglais.')
    expect(details.querySelector('.site-details__content')).toHaveAttribute('lang', 'en')
  })

  it('affiche l’interface en anglais', async () => {
    renderAt(`/en?site=${LAC}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Discover Sanzo differently' })).toBeInTheDocument()
    const details = await screen.findByRole('complementary', { name: 'Site details' })
    expect(details).toHaveTextContent('Collected by Alice on October 3, 2026')
    expect(details).toHaveTextContent('Story written in French.')
    expect(document.documentElement.lang).toBe('en')
  })

  it('propose de réessayer en cas d’erreur de chargement', async () => {
    supabaseState.result = { data: null, error: { message: 'boom' } }
    renderAt('/fr')
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les sites')
    supabaseState.result = { data: storyRows, error: null }
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('button', { name: 'Lac fictif' })).toBeInTheDocument()
  })

  it('indique quand aucun site n’est encore collecté', async () => {
    supabaseState.result = { data: [], error: null }
    renderAt('/fr')
    expect(await screen.findByText('Aucun site n’a encore été collecté.')).toBeInTheDocument()
  })

  it('accueille le visiteur : logo, présentation, sites à découvrir et lien vers l’association', async () => {
    renderAt('/fr')
    await screen.findByRole('button', { name: 'Lac fictif' })
    const panelWelcome = welcome()!
    expect(within(panelWelcome).getByRole('img', { name: 'Logo du CODESA' })).toBeInTheDocument()
    expect(panelWelcome).toHaveTextContent('Choisissez un site dans la liste ou sur la carte pour découvrir son histoire.')
    expect(within(panelWelcome).getByRole('link', { name: /La communauté Mbo Sanzo/ })).toHaveAttribute(
      'href',
      'https://mbosanzo.com/',
    )
    // Seuls les sites qui ont une photo sont mis en avant.
    const featured = within(panelWelcome).getAllByRole('link', { name: /Lac fictif|Village square|Forêt/ })
    expect(featured).toHaveLength(1)
    expect(featured[0]).toHaveTextContent('Patrimoine naturel')

    fireEvent.click(featured[0]!)
    expect(await screen.findByRole('complementary', { name: 'Détails du site' })).toBeInTheDocument()
    expect(welcome()).not.toBeInTheDocument()
  })

  it('fait défiler les miniatures seul, sans ouvrir de site ni toucher à la carte ; un bouton le met en pause', async () => {
    const scrollTo = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { value: scrollTo, configurable: true, writable: true })
    // Ordinateur (rouleau vertical), sans demande de réduction des animations.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes('min-width'),
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const router = renderAt('/fr')
      await screen.findByRole('button', { name: 'Lac fictif' })
      // Laisse React installer le minuteur de rotation (effets après affichage).
      await act(async () => {})
      act(() => vi.advanceTimersByTime(4100))
      expect(scrollTo).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'smooth' })
      expect(panel()).not.toBeInTheDocument()
      expect(router.state.location.search).toBe('')
      expect(screen.getByTestId('map')).toHaveAttribute('data-hovered', '')
      expect(screen.getByTestId('map')).toHaveAttribute('data-active', '')

      scrollTo.mockClear()
      fireEvent.click(screen.getByRole('button', { name: 'Mettre en pause le défilement des sites' }))
      act(() => vi.advanceTimersByTime(10_000))
      expect(scrollTo).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Reprendre le défilement des sites' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
      Reflect.deleteProperty(window, 'matchMedia')
    }
  })

  it('ferme l’accueil pour la durée de la visite ; le logo le rouvre', async () => {
    renderAt('/fr')
    await screen.findByRole('button', { name: 'Lac fictif' })
    fireEvent.click(within(welcome()!).getByRole('button', { name: 'Fermer la présentation' }))
    expect(welcome()).not.toBeInTheDocument()
    expect(sessionStorage.getItem('tourisme-sanzo.welcome-closed')).toBe('1')

    fireEvent.click(screen.getByRole('link', { name: 'Tourisme Sanzo, accueil' }))
    expect(welcome()).toBeInTheDocument()
    expect(sessionStorage.getItem('tourisme-sanzo.welcome-closed')).toBeNull()
  })

  it('indique la catégorie du site et la légende des couleurs de la carte', async () => {
    renderAt(`/fr?site=${LAC}`)
    const details = await screen.findByRole('complementary', { name: 'Détails du site' })
    expect(details.querySelector('.site-details__category')).toHaveTextContent('Patrimoine naturel')
    const legend = screen.getByText('Catégories des sites').closest('details')!
    expect([...legend.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'Patrimoine naturel',
      'Villages et lieux de vie',
      'Autre',
    ])
  })

  it('agrandit les photos en plein écran et les fait défiler au clavier', async () => {
    renderAt(`/fr?site=${LAC}`)
    const details = await screen.findByRole('complementary', { name: 'Détails du site' })
    fireEvent.click(within(details).getByRole('button', { name: 'Agrandir la photo 1' }))
    const viewer = screen.getByRole('dialog', { name: 'Photos : Lac fictif' })
    expect(within(viewer).getByRole('img', { name: 'Vue du lac' })).toHaveAttribute('src', 'https://cdn.test/u/s/photo-1.jpg')
    expect(viewer).toHaveTextContent('1 / 2')
    expect(viewer).toHaveTextContent('Photo : Alice')

    fireEvent.keyDown(viewer, { key: 'ArrowRight' })
    expect(viewer).toHaveTextContent('2 / 2')
    expect(within(viewer).getByRole('img', { name: 'Lac fictif, photo 2' })).toBeInTheDocument()
    fireEvent.click(within(viewer).getByRole('button', { name: 'Photo suivante' }))
    expect(viewer).toHaveTextContent('1 / 2')

    // Échap ferme la visionneuse, pas le panneau de détails.
    fireEvent.keyDown(viewer, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(panel()).toBeInTheDocument()
  })

  it('présente l’association, la contribution, le contact et les mentions légales', async () => {
    renderAt('/fr')
    await screen.findByRole('button', { name: 'Lac fictif' })
    const footer = screen.getAllByRole('navigation', { name: 'Informations sur le site' })[0]!
    fireEvent.click(within(footer).getByRole('link', { name: 'Mentions légales' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'À propos de Tourisme Sanzo' })).toBeInTheDocument()
    for (const name of ['À propos', 'Contribuer', 'Contact', 'Mentions légales']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('link', { name: 'codesannzo@gmail.com' })[0]).toHaveAttribute(
      'href',
      'mailto:codesannzo@gmail.com',
    )
  })

  it('affiche une page introuvable pour une URL inconnue', async () => {
    renderAt('/fr/inexistant')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument()
  })
})

describe('recherche', () => {
  const searchInput = () => screen.getByRole('combobox', { name: 'Rechercher un site touristique' })

  it('filtre les miniatures et la carte, sans tenir compte des accents', async () => {
    renderAt('/fr')
    await screen.findByRole('button', { name: 'Lac fictif' })
    fireEvent.change(searchInput(), { target: { value: 'foret' } })
    expect(thumbnails().getAllByRole('button')).toHaveLength(1)
    expect(thumbnails().getByRole('button', { name: 'Forêt des singes' })).toBeInTheDocument()
    expect(thumbnails().getByText('1 site')).toBeInTheDocument()
    expect(within(screen.getByTestId('map')).getAllByRole('button')).toHaveLength(1)
  })

  it('propose des suggestions ; un choix ouvre le site', async () => {
    const router = renderAt('/fr')
    await screen.findByRole('button', { name: 'Lac fictif' })
    fireEvent.focus(searchInput())
    fireEvent.change(searchInput(), { target: { value: 'village' } })
    expect(searchInput()).toHaveAttribute('aria-expanded', 'true')
    const option = screen.getByRole('option', { name: 'Village square' })
    fireEvent.mouseDown(option)
    expect(await screen.findByRole('heading', { level: 2, name: 'Village square' })).toBeInTheDocument()
    expect(router.state.location.search).toBe(`?site=${VILLAGE}`)
    expect(searchInput()).toHaveAttribute('aria-expanded', 'false')
  })

  it('se parcourt au clavier : flèches puis Entrée', async () => {
    renderAt('/fr')
    await screen.findByRole('button', { name: 'Lac fictif' })
    fireEvent.focus(searchInput())
    fireEvent.change(searchInput(), { target: { value: 'f' } })
    fireEvent.keyDown(searchInput(), { key: 'ArrowDown' })
    fireEvent.keyDown(searchInput(), { key: 'ArrowDown' })
    const second = screen.getAllByRole('option')[1]!
    expect(second).toHaveAttribute('aria-selected', 'true')
    expect(searchInput()).toHaveAttribute('aria-activedescendant', second.id)
    fireEvent.keyDown(searchInput(), { key: 'Enter' })
    expect(await screen.findByRole('heading', { level: 2, name: second.textContent! })).toBeInTheDocument()
  })

  it('indique l’absence de résultat et permet d’effacer la recherche', async () => {
    renderAt('/fr')
    await screen.findByRole('button', { name: 'Lac fictif' })
    fireEvent.focus(searchInput())
    fireEvent.change(searchInput(), { target: { value: 'cascade' } })
    expect(screen.getAllByText('Aucun site ne correspond à « cascade ».').length).toBeGreaterThan(0)
    expect(thumbnails().queryAllByRole('button')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Effacer la recherche' }))
    expect(thumbnails().getAllByRole('button')).toHaveLength(3)
  })
})

describe('collecte', () => {
  function mockGeolocation() {
    const handlers: { failure?: (error: GeolocationPositionError) => void } = {}
    const geolocation = {
      watchPosition: vi.fn((_success: unknown, failure: (error: GeolocationPositionError) => void) => {
        handlers.failure = failure
        return 1
      }),
      clearWatch: vi.fn(),
      getCurrentPosition: vi.fn(),
    }
    Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true })
    return { geolocation, handlers }
  }

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'geolocation')
  })

  it('demande le nom et le code d’accès à la première ouverture, par-dessus la carte', async () => {
    window.history.replaceState(null, '', '/fr/collecte')
    renderAt('/fr/collecte')
    expect(await screen.findByRole('dialog', { name: 'Collecte des sites touristiques' })).toBeInTheDocument()
    expect(screen.getByTestId('collect-map')).toBeInTheDocument()
    expect(screen.getByLabelText('Votre nom')).toBeInTheDocument()
    expect(screen.getByLabelText('Code d’accès')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ajouter un site/ })).not.toBeInTheDocument()
  })

  it('n’affiche pas le champ de code quand il est fourni par le lien, et le retire de l’URL', async () => {
    sessionStorage.clear()
    window.history.replaceState(null, '', '/fr/collecte#code=SANZO-TEST')
    renderAt('/fr/collecte')
    expect(await screen.findByLabelText('Votre nom')).toBeInTheDocument()
    expect(screen.queryByLabelText('Code d’accès')).not.toBeInTheDocument()
    expect(window.location.hash).toBe('')
    expect(sessionStorage.getItem('tourisme-sanzo.collect.code')).toBe('SANZO-TEST')
  })

  it('demande l’accès à la position dès l’ouverture de l’application', async () => {
    const { geolocation } = mockGeolocation()
    renderAt('/fr/collecte')
    await screen.findByTestId('collect-map')
    expect(geolocation.watchPosition).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Recherche de votre position…')).toBeInTheDocument()
  })

  it('explique comment réactiver la localisation après un refus', async () => {
    const { geolocation, handlers } = mockGeolocation()
    renderAt('/fr/collecte')
    await screen.findByTestId('collect-map')
    act(() =>
      handlers.failure!({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('La localisation est désactivée')
    fireEvent.click(screen.getByRole('button', { name: 'Activer la localisation' }))
    expect(geolocation.watchPosition).toHaveBeenCalledTimes(2)
  })

  it('affiche la carte plein écran et le bouton « Ajouter un site » qui ouvre le formulaire', async () => {
    supabaseState.session = { user: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } }
    supabaseState.collector = { display_name: 'Alice', is_active: true }
    const router = renderAt('/fr/collecte')
    const addButton = await screen.findByRole('link', { name: /Ajouter un site/ })
    expect(screen.getByTestId('collect-map')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mes sites (0)' })).toBeInTheDocument()

    fireEvent.click(addButton)
    const dialog = await screen.findByRole('dialog', { name: 'Nouveau site' })
    expect(router.state.location.pathname).toBe('/fr/collecte/nouveau')
    expect(dialog).toContainElement(screen.getByLabelText(/Nom du site touristique/))
    expect(screen.getByLabelText(/Catégorie/)).toHaveDisplayValue('Choisir une catégorie')
    expect(screen.getByRole('option', { name: 'Patrimoine naturel' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nom du collecteur/)).toHaveValue('Alice')
    expect(screen.getByTestId('collect-map')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(router.state.location.pathname).toBe('/fr/collecte')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('indique un accès désactivé', async () => {
    supabaseState.session = { user: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } }
    supabaseState.collector = { display_name: 'Alice', is_active: false }
    renderAt('/fr/collecte')
    expect(await screen.findByText('Votre accès à la collecte a été désactivé. Contactez l’association.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ajouter un site/ })).not.toBeInTheDocument()
  })
})
