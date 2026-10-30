import { useTranslation } from 'react-i18next'
import { MessagePage } from '../components/MessagePage'

export function NotFoundPage() {
  const { t } = useTranslation()
  return <MessagePage title={t('access.notFoundTitle')} body={t('access.notFoundBody')} />
}

export function RouteErrorPage() {
  const { t } = useTranslation()
  return <MessagePage title={t('errors.generic')} body={t('errors.network')} />
}
