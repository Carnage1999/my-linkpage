import { useEffect, useId, useRef, useState } from 'react'
import { useManageCopy } from '../../../manage/useManageCopy'
import { SocialIcon } from '../../../SocialIcon'
import type { IconRecord } from '../../../icons/catalog'

type Catalog = typeof import('../../../icons/catalog')

export function IconPicker({
  url,
  iconSlug,
  iconPath,
  onChange,
}: {
  url: string
  iconSlug: string
  iconPath?: string
  onChange: (iconSlug: string) => void
}) {
  const { t } = useManageCopy()
  const dialogId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    void import('../../../icons/catalog')
      .then((mod) => {
        if (!cancelled) setCatalog(mod)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const node = dialogRef.current
    if (!open || !node) return undefined
    node.showModal()
    return () => {
      if (node.open) node.close()
    }
  }, [open])

  const manual = iconSlug.trim().length > 0
  const slug = catalog ? (manual ? catalog.canonicalSlug(iconSlug) : catalog.resolveIconSlug(url)) : null
  const path = (slug ? catalog?.iconBySlug(slug)?.path : undefined) ?? iconPath
  const results = catalog ? catalog.searchIcons(query) : []

  return (
    <div className="flex items-center gap-2">
      <SocialIcon path={path} />
      <span className="text-xs text-slate-500">{manual ? String(t('manageIconManual')) : String(t('manageIconAuto'))}</span>
      <button
        type="button"
        className="text-sm text-slate-600 underline dark:text-slate-300"
        onClick={() => {
          setQuery('')
          setOpen(true)
        }}
      >
        {String(t('manageIconSearch'))}
      </button>
      {manual ? (
        <button type="button" className="text-sm text-slate-500 underline" onClick={() => onChange('')}>
          {String(t('manageIconReset'))}
        </button>
      ) : null}
      {open ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={dialogId}
          className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl backdrop:bg-slate-950/40 dark:bg-slate-900"
          onCancel={(event) => {
            event.preventDefault()
            setOpen(false)
          }}
        >
          <h3 id={dialogId} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {String(t('manageIconSearch'))}
          </h3>
          <input
            autoFocus
            aria-label={String(t('manageIconSearch'))}
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={query}
            placeholder={String(t('manageIconSearch'))}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto" role="listbox" aria-labelledby={dialogId}>
            {results.map((icon: IconRecord) => (
              <li key={icon.slug}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    onChange(icon.slug)
                    setOpen(false)
                  }}
                >
                  <SocialIcon path={icon.path} />
                  <span>{icon.title}</span>
                  <span className="text-xs text-slate-400">{icon.slug}</span>
                </button>
              </li>
            ))}
          </ul>
        </dialog>
      ) : null}
    </div>
  )
}
