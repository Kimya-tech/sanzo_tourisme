import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { isLanguage, preferredLanguage, rememberLanguage } from '../i18n/languages'

// Valide le préfixe de langue de l'URL et synchronise i18next et l'attribut <html lang>.
export function LanguageRoute() {
  const { lang } = useParams()
  const location = useLocation()
  const { i18n } = useTranslation()

  useEffect(() => {
    if (!isLanguage(lang)) return
    document.documentElement.lang = lang
    rememberLanguage(lang)
    if (i18n.language !== lang) void i18n.changeLanguage(lang)
  }, [i18n, lang])

  if (!isLanguage(lang)) {
    return <Navigate replace to={`/${preferredLanguage()}${location.pathname}${location.search}${location.hash}`} />
  }
  if (i18n.language !== lang) return null
  return <Outlet />
}

export function RootRedirect() {
  const location = useLocation()
  return <Navigate replace to={`/${preferredLanguage()}${location.search}${location.hash}`} />
}
