import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Field, FormError } from '../components/Form'
import type { ErrorKey } from '../lib/errors'
import { storedCode, useCollector } from './collector-context'

export function Onboarding() {
  const { t } = useTranslation()
  const { register } = useCollector()
  const [codeFromLink, setCodeFromLink] = useState(storedCode)
  const [error, setError] = useState<ErrorKey | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setError(null)
    const result = await register(String(form.get('name') ?? ''), codeFromLink || String(form.get('code') ?? ''))
    setSubmitting(false)
    setError(result)
    // Code du lien erroné : on affiche le champ pour une saisie manuelle.
    if (result === 'errors.invalidCode') setCodeFromLink('')
  }

  return (
    <section className="collect-card">
      <h1>{t('collect.title')}</h1>
      <p>{t('collect.onboardingIntro')}</p>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field id="collector-name" label={t('collect.yourName')}>
          <input id="collector-name" name="name" autoComplete="name" minLength={2} maxLength={80} required />
        </Field>
        {!codeFromLink && (
          <Field id="collect-code" label={t('collect.accessCode')} hint={t('collect.accessCodeHint')}>
            <input
              id="collect-code"
              name="code"
              autoComplete="off"
              autoCapitalize="characters"
              required
              aria-describedby="collect-code-hint"
            />
          </Field>
        )}
        <FormError>{error && t(error)}</FormError>
        <button className="button button--primary button--large" type="submit" disabled={submitting}>
          {t('collect.start')}
        </button>
      </form>
    </section>
  )
}
