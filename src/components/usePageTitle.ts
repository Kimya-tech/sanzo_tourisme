import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function usePageTitle(title: string): void {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = `${title} · ${t('app.name')}`
  }, [t, title])
}
