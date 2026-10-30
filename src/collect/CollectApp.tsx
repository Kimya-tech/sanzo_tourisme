import { useEffect, useState } from 'react'
import { captureCodeFromHash } from './collector-context'
import { CollectHome } from './CollectHome'
import { CollectorProvider } from './CollectorProvider'
import { GeolocationProvider } from './GeolocationProvider'

// Déclare le manifeste PWA uniquement sur la collecte : « Ajouter à l'écran d'accueil » ouvre la collecte.
function useCollectManifest() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/manifest.webmanifest'
    document.head.append(link)
    return () => link.remove()
  }, [])
}

export default function CollectApp() {
  // Lit le code d'accès du lien (#code=…) avant le premier rendu du formulaire.
  useState(captureCodeFromHash)
  useCollectManifest()

  return (
    <GeolocationProvider>
      <CollectorProvider>
        <CollectHome />
      </CollectorProvider>
    </GeolocationProvider>
  )
}
