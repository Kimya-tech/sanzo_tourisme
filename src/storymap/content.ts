import type { StoryPhoto } from './useStorySites'

export type ContentBlock =
  | { type: 'photo'; photo: StoryPhoto; index: number }
  | { type: 'text'; text: string; index: number }

// Chaque retour à la ligne saisi par le collecteur marque un nouveau paragraphe.
export function splitParagraphs(description: string): string[] {
  return description
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

/**
 * Alterne photos et paragraphes : photo principale, texte, photo, texte…
 * Les photos ou paragraphes en surplus sont placés à la suite, dans leur ordre.
 */
export function interleaveContent(photos: StoryPhoto[], paragraphs: string[]): ContentBlock[] {
  const blocks: ContentBlock[] = []
  for (let i = 0; i < Math.max(photos.length, paragraphs.length); i++) {
    const photo = photos[i]
    const text = paragraphs[i]
    if (photo) blocks.push({ type: 'photo', photo, index: i })
    if (text !== undefined) blocks.push({ type: 'text', text, index: i })
  }
  return blocks
}
