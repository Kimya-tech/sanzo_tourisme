// Dates « AAAA-MM-JJ » manipulées en heure locale (évite les décalages de fuseau horaire).

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatIsoDate(value: string, language: string): string {
  const date = parseIsoDate(value)
  return date ? new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(date) : value
}

export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
