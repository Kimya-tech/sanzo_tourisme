import { createBrowserRouter, type RouteObject } from 'react-router'
import { PageLoader } from '../components/PageLoader'
import { InfoPage } from '../pages/InfoPage'
import { NotFoundPage, RouteErrorPage } from '../pages/NotFoundPage'
import { StoryMapPage } from '../storymap/StoryMapPage'
import { LanguageRoute, RootRedirect } from './LanguageRoute'

// /fr ou /en : story map (page unique publique) ; /fr/infos : à propos, contribuer, contact, mentions légales.
// /fr/collecte : application de collecte (liens personnels des membres de l'association), chargée à la demande.
export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  {
    path: '/:lang',
    element: <LanguageRoute />,
    hydrateFallbackElement: <PageLoader />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <StoryMapPage /> },
      { path: 'infos', element: <InfoPage /> },
      {
        path: 'collecte/*',
        lazy: async () => ({ Component: (await import('../collect/CollectApp')).default }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}