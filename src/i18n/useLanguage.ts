import { useParams } from 'react-router'
import { DEFAULT_LANGUAGE, isLanguage, type Language } from './languages'

export function useLanguage(): Language {
  const { lang } = useParams()
  return isLanguage(lang) ? lang : DEFAULT_LANGUAGE
}
