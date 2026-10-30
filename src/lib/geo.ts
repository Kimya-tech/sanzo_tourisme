// Mêmes bornes que la contrainte SQL sites_location_cameroon.
export function isInCameroon(lat: number, lng: number): boolean {
  return lat >= 1.5 && lat <= 13.5 && lng >= 8.0 && lng <= 16.5
}
