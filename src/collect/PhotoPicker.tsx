import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { photoUrl } from '../lib/supabase'
import type { ExistingPhoto } from './api'

export interface NewPhoto {
  key: string
  file: File
  previewUrl: string
  caption: string
  failed: boolean
}

interface PhotoPickerProps {
  existing: ExistingPhoto[]
  added: NewPhoto[]
  onRemoveExisting: (photo: ExistingPhoto) => void
  onAdd: (photos: NewPhoto[]) => void
  onChangeAdded: (photos: NewPhoto[]) => void
  disabled: boolean
}

function createNewPhotos(files: FileList | null): NewPhoto[] {
  return Array.from(files ?? [])
    .filter((file) => file.type.startsWith('image/'))
    .map((file) => ({
      key: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      failed: false,
    }))
}

export function PhotoPicker({ existing, added, onRemoveExisting, onAdd, onChangeAdded, disabled }: PhotoPickerProps) {
  const { t } = useTranslation()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const addedRef = useRef(added)

  useEffect(() => {
    addedRef.current = added
  }, [added])

  // Libère les aperçus restants à la fermeture du formulaire.
  useEffect(() => () => addedRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), [])

  function handleFiles(files: FileList | null, input: HTMLInputElement | null) {
    onAdd(createNewPhotos(files))
    if (input) input.value = ''
  }

  function remove(photo: NewPhoto) {
    URL.revokeObjectURL(photo.previewUrl)
    onChangeAdded(added.filter((item) => item.key !== photo.key))
  }

  return (
    <div className="photo-picker">
      <div className="photo-picker__actions">
        <button type="button" className="button" onClick={() => cameraRef.current?.click()} disabled={disabled}>
          {t('collect.takePhoto')}
        </button>
        <button type="button" className="button" onClick={() => galleryRef.current?.click()} disabled={disabled}>
          {t('collect.choosePhotos')}
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => handleFiles(event.target.files, event.target)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          data-testid="photo-gallery-input"
          onChange={(event) => handleFiles(event.target.files, event.target)}
        />
      </div>

      <ul className="photo-picker__list">
        {existing.map((photo) => (
          <li key={photo.id} className="photo-item">
            <img src={photoUrl(photo.thumbPath ?? photo.path)} alt={photo.caption ?? ''} />
            <div className="photo-item__body">
              {photo.caption && <p>{photo.caption}</p>}
              <button
                type="button"
                className="link-button"
                onClick={() => onRemoveExisting(photo)}
                disabled={disabled}
              >
                {t('collect.removePhoto')}
              </button>
            </div>
          </li>
        ))}
        {added.map((photo) => (
          <li key={photo.key} className={`photo-item${photo.failed ? ' is-failed' : ''}`}>
            <img src={photo.previewUrl} alt="" />
            <div className="photo-item__body">
              <label className="visually-hidden" htmlFor={`caption-${photo.key}`}>
                {t('collect.caption')}
              </label>
              <input
                id={`caption-${photo.key}`}
                placeholder={t('collect.caption')}
                maxLength={300}
                value={photo.caption}
                disabled={disabled}
                onChange={(event) =>
                  onChangeAdded(
                    added.map((item) => (item.key === photo.key ? { ...item, caption: event.target.value } : item)),
                  )
                }
              />
              {photo.failed && <p className="form-error">{t('errors.photoFailed')}</p>}
              <button type="button" className="link-button" onClick={() => remove(photo)} disabled={disabled}>
                {t('collect.removePhoto')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
