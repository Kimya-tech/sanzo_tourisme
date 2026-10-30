import { useTranslation } from 'react-i18next'

export function PageLoader() {
  const { t } = useTranslation()
  return (
    <div className="page-loader" role="status" aria-live="polite">
      {t('app.loading')}
    </div>
  )
}
