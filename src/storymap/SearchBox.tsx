import { useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { photoUrl } from '../lib/supabase'
import type { StorySite } from './useStorySites'

interface SearchBoxProps {
  query: string
  results: StorySite[]
  onQueryChange: (query: string) => void
  onSelect: (id: string) => void
}

const MAX_SUGGESTIONS = 8

// Champ de recherche avec suggestions (motif ARIA « combobox ») : flèches pour parcourir, Entrée pour ouvrir.
export function SearchBox({ query, results, onQueryChange, onSelect }: SearchBoxProps) {
  const { t } = useTranslation()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const suggestions = query.trim() ? results.slice(0, MAX_SUGGESTIONS) : []
  const expanded = open && query.trim() !== ''

  function choose(site: StorySite, input?: HTMLInputElement | null) {
    onSelect(site.id)
    setOpen(false)
    setActiveIndex(-1)
    input?.blur()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
    } else if (event.key === 'Enter') {
      const site = suggestions[activeIndex >= 0 ? activeIndex : 0]
      if (site) {
        event.preventDefault()
        choose(site, event.currentTarget)
      }
    } else if (event.key === 'Escape') {
      if (expanded) setOpen(false)
      else onQueryChange('')
      setActiveIndex(-1)
    }
  }

  return (
    <div className="search" role="search">
      <label className="visually-hidden" htmlFor={`${listId}-input`}>
        {t('story.searchLabel')}
      </label>
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        placeholder={t('story.searchPlaceholder')}
        value={query}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        onChange={(event) => {
          onQueryChange(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {query && (
        <button
          type="button"
          className="search__clear"
          aria-label={t('story.clearSearch')}
          onClick={() => {
            onQueryChange('')
            setActiveIndex(-1)
          }}
        >
          ×
        </button>
      )}
      <ul id={listId} role="listbox" className="search__results" hidden={!expanded} aria-label={t('story.searchLabel')}>
        {suggestions.map((site, index) => {
          const cover = site.photos[0]
          return (
            <li
              key={site.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // mousedown plutôt que click : le champ ne perd pas le focus avant la sélection.
              onMouseDown={(event) => {
                event.preventDefault()
                choose(site)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {cover ? (
                <img src={photoUrl(cover.thumb ?? cover.path)} alt="" />
              ) : (
                <span className="search__no-photo" aria-hidden="true" />
              )}
              <span>{site.name}</span>
            </li>
          )
        })}
        {expanded && suggestions.length === 0 && (
          <li className="search__empty" role="presentation">
            {t('story.noResults', { query: query.trim() })}
          </li>
        )}
      </ul>
    </div>
  )
}
