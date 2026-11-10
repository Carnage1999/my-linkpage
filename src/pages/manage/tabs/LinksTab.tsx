import { useTranslation } from 'react-i18next'
import { fieldClass, type SiteDraft } from '../useSiteDraft'
import { IconPicker } from './IconPicker'

export function LinksTab({ draft }: { draft: SiteDraft }) {
  const { t } = useTranslation()

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">{String(t('manageTabLinks'))}</h2>
        <button
          type="button"
          className="text-sm text-slate-500 underline"
          onClick={() =>
            draft.setRows([
              ...draft.rows,
              { key: `new-${draft.rows.length}-${Date.now()}`, originalId: '', id: '', label: '', url: 'https://', iconSlug: '' },
            ])
          }
        >
          {String(t('manageAddLink'))}
        </button>
      </div>
      {draft.rows.map((row, index) => (
        <div key={row.key} className="grid gap-2 rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
          <div className="grid gap-2 sm:grid-cols-3">
            <input className={fieldClass} aria-label="id" value={row.id} onChange={(event) => draft.updateRow(row.key, { id: event.target.value })} />
            <input className={fieldClass} aria-label="label" value={row.label} onChange={(event) => draft.updateRow(row.key, { label: event.target.value })} />
            <input className={fieldClass} aria-label="url" value={row.url} onChange={(event) => draft.updateRow(row.key, { url: event.target.value })} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <IconPicker
              url={row.url}
              iconSlug={row.iconSlug}
              iconPath={row.iconPath}
              onChange={(iconSlug) => draft.updateRow(row.key, { iconSlug })}
            />
            <button type="button" className="text-sm text-slate-500" onClick={() => draft.move(index, -1)} aria-label="up">
              ↑
            </button>
            <button type="button" className="text-sm text-slate-500" onClick={() => draft.move(index, 1)} aria-label="down">
              ↓
            </button>
            <button type="button" className="text-sm text-rose-500" onClick={() => draft.setRows(draft.rows.filter((item) => item.key !== row.key))}>
              {String(t('manageDelete'))}
            </button>
          </div>
        </div>
      ))}
      {draft.status ? <p className="text-sm text-slate-500">{draft.status}</p> : null}
      <button type="button" disabled={draft.saving} onClick={draft.save} className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
        {draft.saving ? String(t('manageSaving')) : String(t('manageSave'))}
      </button>
    </section>
  )
}
