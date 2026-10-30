import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../i18n/useLanguage'
import { usePageTitle } from './usePageTitle'

export function MessagePage({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  const { t } = useTranslation()
  const language = useLanguage()
  usePageTitle(title)
  return (
    <section className="page narrow">
      <h1>{title}</h1>
      <p>{body}</p>
      {children}
      <p>
        <Link to={`/${language}`}>{t('access.backHome')}</Link>
      </p>
    </section>
  )
}
