import type { ReactNode } from 'react'

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="form-error" role="alert">
      {children}
    </p>
  )
}

interface FieldProps {
  id: string
  label: string
  hint?: string
  children: ReactNode
}

export function Field({ id, label, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  )
}
