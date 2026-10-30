// Itinéraire vers un site, poursuivi dans Google Maps (site web ou application sur téléphone).
// Sans point de départ, Google Maps part de la position actuelle de l'utilisateur et le laisse choisir
// le mode de transport. Les coordonnées GPS sont plus fiables que le nom du site pour la destination.
export function googleMapsDirectionsUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
