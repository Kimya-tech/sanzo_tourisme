import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Field, FormError } from '../components/Form'
import { PageLoader } from '../components/PageLoader'
import { usePageTitle } from '../components/usePageTitle'
import { useLanguage } from '../i18n/useLanguage'
import { CATEGORIES, isCategory, type Category } from '../lib/categories'
import { todayIso } from '../lib/dates'
import { errorKey, type ErrorKey } from '../lib/errors'
import { createSite, deletePhoto, deleteSite, getMySite, updateSite, uploadPhoto, type ExistingPhoto } from './api'
import { useReadyCollector } from './collector-context'
import { clearDraft, isDraftEmpty, loadDraft, saveDraft } from './draft'
import { useGeolocation } from './geolocation-context'
import { LocationPicker, type PickedLocation } from './LocationPicker'
import { PhotoPicker, type NewPhoto } from './PhotoPicker'
import { preparePhoto } from './photos'
import { Sheet } from './Sheet'
import { validateSiteForm, type SiteFormError, type SiteFormValues } from './validation'

function emptyValues(collectorName: string): SiteFormValues {
  return {
    name: '',
    category: '',
    description: '',
    collectedOn: todayIso(),
    collectorName,
    latitude: null,
    longitude: null,
    accuracy: null,
  }
}

interface SiteFormPageProps {
  onSaved: () => void
  onClose: () => void
}

export function SiteFormPage({ onSaved, onClose }: SiteFormPageProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const navigate = useNavigate()
  const { siteId } = useParams()
  const collector = useReadyCollector()
  const geo = useGeolocation()
  const isNew = !siteId
  // Tant que la position n'a pas été choisie à la main, un nouveau site suit la position GPS du téléphone.
  const [locationTouched, setLocationTouched] = useState(false)

  const [initialDraft] = useState(() => (isNew ? loadDraft() : null))
  const [values, setValues] = useState<SiteFormValues>(() => {
    if (initialDraft && !isDraftEmpty(initialDraft)) {
      return { ...initialDraft, collectedOn: initialDraft.collectedOn || todayIso(), collectorName: initialDraft.collectorName || collector.name }
    }
    return emptyValues(collector.name)
  })
  const [draftRestored, setDraftRestored] = useState(() => initialDraft !== null && !isDraftEmpty(initialDraft))
  const [loading, setLoading] = useState(!isNew)
  const [notFound, setNotFound] = useState(false)
  // Identifiant du site une fois créé : un nouvel essai d'envoi de photos met alors à jour ce site.
  const [savedId, setSavedId] = useState<string | null>(siteId ?? null)
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([])
  const [removedPhotos, setRemovedPhotos] = useState<ExistingPhoto[]>([])
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([])
  const [formErrors, setFormErrors] = useState<SiteFormError[]>([])
  const [error, setError] = useState<ErrorKey | 'collect.photosNotSent' | null>(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  usePageTitle(t(isNew ? 'collect.newSite' : 'collect.editSite'))

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    getMySite(siteId)
      .then((site) => {
        if (cancelled) return
        if (!site) {
          setNotFound(true)
        } else {
          setValues({
            name: site.name,
            category: site.category,
            description: site.description,
            collectedOn: site.collectedOn,
            collectorName: site.collectorName,
            latitude: site.latitude,
            longitude: site.longitude,
            accuracy: site.accuracy,
          })
          setExistingPhotos(site.photos)
        }
        setLoading(false)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(errorKey(loadError))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [siteId])

  // Brouillon conservé sur l'appareil tant que le nouveau site n'est pas enregistré.
  useEffect(() => {
    if (isNew && !savedId) saveDraft(values)
  }, [isNew, savedId, values])

  const title = t(isNew ? 'collect.newSite' : 'collect.editSite')
  if (loading) {
    return (
      <Sheet label={title} onClose={onClose}>
        <PageLoader />
      </Sheet>
    )
  }
  if (notFound) {
    return (
      <Sheet label={title} onClose={onClose}>
        <p>{t('access.notFoundBody')}</p>
      </Sheet>
    )
  }

  const update = <K extends keyof SiteFormValues>(key: K, value: SiteFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const location: PickedLocation | null =
    values.latitude !== null && values.longitude !== null
      ? { latitude: values.latitude, longitude: values.longitude, accuracy: values.accuracy }
      : isNew && !locationTouched && geo.position
        ? { latitude: geo.position.latitude, longitude: geo.position.longitude, accuracy: geo.position.accuracy }
        : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitted: SiteFormValues = {
      ...values,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      accuracy: location?.accuracy ?? null,
    }
    const problems = validateSiteForm(submitted, todayIso())
    setFormErrors(problems)
    setError(null)
    if (problems.length > 0) return

    setValues(submitted)
    setSaving(true)
    const input = {
      name: submitted.name,
      category: submitted.category as Category,
      description: submitted.description,
      collectedOn: submitted.collectedOn,
      collectorName: submitted.collectorName,
      language,
      latitude: submitted.latitude!,
      longitude: submitted.longitude!,
      accuracy: submitted.accuracy,
    }
    let id = savedId
    try {
      if (id) {
        await updateSite(id, input)
      } else {
        id = await createSite(input)
        setSavedId(id)
        clearDraft()
      }
      for (const photo of removedPhotos) await deletePhoto(photo)
      setRemovedPhotos([])
    } catch (saveError) {
      setError(errorKey(saveError))
      setSaving(false)
      return
    }

    const total = newPhotos.length
    const failed: NewPhoto[] = []
    let order = existingPhotos.length
    setProgress({ done: 0, total })
    for (const [index, photo] of newPhotos.entries()) {
      try {
        const prepared = await preparePhoto(photo.file)
        await uploadPhoto(collector.userId, id, prepared, photo.caption, order++)
        URL.revokeObjectURL(photo.previewUrl)
      } catch {
        failed.push({ ...photo, failed: true })
      }
      setProgress({ done: index + 1, total })
    }
    setSaving(false)
    setProgress(null)

    if (failed.length > 0) {
      setNewPhotos(failed)
      setError('collect.photosNotSent')
      onSaved()
      return
    }
    onSaved()
    void navigate(`/${language}/collecte`, { state: { message: 'collect.saved', siteId: id } })
  }

  async function handleDelete() {
    if (!savedId || !window.confirm(t('collect.confirmDelete'))) return
    setSaving(true)
    try {
      await deleteSite({ id: savedId, photos: [...existingPhotos, ...removedPhotos] })
      onSaved()
      void navigate(`/${language}/collecte`, { state: { message: 'collect.deleted' } })
    } catch (deleteError) {
      setError(errorKey(deleteError))
      setSaving(false)
    }
  }

  const fieldError = (key: SiteFormError) =>
    formErrors.includes(key) ? <FormError>{t(key)}</FormError> : null

  return (
    <Sheet label={title} onClose={onClose}>
      <h1>{title}</h1>
      {draftRestored && (
        <p className="notice" role="status">
          {t('collect.draftRestored')}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              clearDraft()
              setValues(emptyValues(collector.name))
              setDraftRestored(false)
            }}
          >
            {t('collect.discardDraft')}
          </button>
        </p>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Field id="site-name" label={`${t('collect.siteName')} *`}>
          <input
            id="site-name"
            value={values.name}
            maxLength={150}
            onChange={(event) => update('name', event.target.value)}
            aria-invalid={formErrors.includes('validation.nameRequired')}
          />
          {fieldError('validation.nameRequired')}
        </Field>

        <Field id="site-category" label={`${t('collect.category')} *`}>
          <select
            id="site-category"
            value={values.category}
            onChange={(event) => update('category', isCategory(event.target.value) ? event.target.value : '')}
            aria-invalid={formErrors.includes('validation.categoryRequired')}
          >
            <option value="">{t('collect.categoryPlaceholder')}</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </select>
          {fieldError('validation.categoryRequired')}
        </Field>

        <Field id="site-description" label={`${t('collect.description')} *`} hint={t('collect.descriptionHint')}>
          <textarea
            id="site-description"
            rows={6}
            maxLength={5000}
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            aria-describedby="site-description-hint"
            aria-invalid={formErrors.includes('validation.descriptionRequired')}
          />
          {fieldError('validation.descriptionRequired')}
        </Field>

        <div className="field-row">
          <Field id="site-date" label={`${t('collect.collectedOn')} *`}>
            <input
              id="site-date"
              type="date"
              max={todayIso()}
              value={values.collectedOn}
              onChange={(event) => update('collectedOn', event.target.value)}
              aria-invalid={formErrors.includes('validation.dateRequired')}
            />
            {fieldError('validation.dateRequired')}
          </Field>
          <Field id="site-collector" label={`${t('collect.collectorName')} *`}>
            <input
              id="site-collector"
              value={values.collectorName}
              maxLength={80}
              onChange={(event) => update('collectorName', event.target.value)}
              aria-invalid={formErrors.includes('validation.collectorRequired')}
            />
            {fieldError('validation.collectorRequired')}
          </Field>
        </div>

        <fieldset className="field">
          <legend>{t('collect.location')} *</legend>
          <LocationPicker
            value={location}
            userPosition={geo.position}
            onChange={(next) => {
              setLocationTouched(true)
              setValues((current) => ({
                ...current,
                latitude: next.latitude,
                longitude: next.longitude,
                accuracy: next.accuracy,
              }))
            }}
          />
          {fieldError('validation.locationRequired')}
          {fieldError('validation.locationOutside')}
        </fieldset>

        <fieldset className="field">
          <legend>{t('collect.photos')}</legend>
          <PhotoPicker
            existing={existingPhotos}
            added={newPhotos}
            disabled={saving}
            onRemoveExisting={(photo) => {
              setExistingPhotos((current) => current.filter((item) => item.id !== photo.id))
              setRemovedPhotos((current) => [...current, photo])
            }}
            onAdd={(photos) => setNewPhotos((current) => [...current, ...photos])}
            onChangeAdded={setNewPhotos}
          />
        </fieldset>

        <FormError>{error && t(error)}</FormError>
        {progress && progress.total > 0 && (
          <p role="status">
            {t('collect.uploading', progress)}
            <progress max={progress.total} value={progress.done} />
          </p>
        )}

        <button className="button button--primary button--large" type="submit" disabled={saving}>
          {saving ? t('collect.saving') : t('collect.save')}
        </button>
      </form>

      {savedId && (
        <button type="button" className="button button--danger" onClick={() => void handleDelete()} disabled={saving}>
          {t('collect.deleteSite')}
        </button>
      )}
    </Sheet>
  )
}
