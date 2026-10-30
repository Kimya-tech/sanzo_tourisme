import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { fr } from './fr'
import { DEFAULT_LANGUAGE, languageFromPath } from './languages'

export const resources = {
  fr: { translation: fr },
  en: { translation: en },
} as const

const initialLanguage =
  typeof window !== 'undefined' ? (languageFromPath(window.location.pathname) ?? DEFAULT_LANGUAGE) : DEFAULT_LANGUAGE

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ['fr', 'en'],
  interpolation: { escapeValue: false },
})

export default i18n
