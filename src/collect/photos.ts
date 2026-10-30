// Préparation des photos sur l'appareil, avant envoi :
//  - photo redimensionnée (côté le plus long : 1600 px) pour les connexions mobiles lentes ;
//  - miniature (480 px) pour la liste des sites de la plateforme ;
//  - réencodage JPEG, qui supprime aussi les métadonnées EXIF (dont la position GPS de l'appareil).

export const MAX_PHOTO_SIZE = 1600
export const THUMB_SIZE = 480

export interface EncodedImage {
  blob: Blob
  width: number
  height: number
}

export interface PreparedPhoto {
  full: EncodedImage
  thumb: EncodedImage
}

export function computeTargetSize(width: number, height: number, max = MAX_PHOTO_SIZE) {
  if (width <= 0 || height <= 0) throw new Error('Dimensions invalides')
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    // Applique l'orientation EXIF (photos prises en portrait).
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => undefined }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function encode(source: CanvasImageSource, width: number, height: number, max: number, quality: number) {
  const target = computeTargetSize(width, height, max)
  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas indisponible')
  context.drawImage(source, 0, 0, target.width, target.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Encodage impossible')
  return { blob, ...target }
}

export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const decoded = await decode(file)
  try {
    const full = await encode(decoded.source, decoded.width, decoded.height, MAX_PHOTO_SIZE, 0.82)
    const thumb = await encode(decoded.source, decoded.width, decoded.height, THUMB_SIZE, 0.75)
    return { full, thumb }
  } finally {
    decoded.close()
  }
}
