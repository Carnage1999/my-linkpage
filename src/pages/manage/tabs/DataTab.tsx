import { useTranslation } from 'react-i18next'
import type { SiteDraft } from '../useSiteDraft'

export function DataTab({ draft }: { draft: SiteDraft }) {
  const { t } = useTranslation()

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">{String(t('manageTabData'))}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{String(t('manageRedeploy'))}</p>
      {draft.status ? <p className="text-sm text-slate-500">{draft.status}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={draft.importSeed} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
          {String(t('manageImport'))}
        </button>
        <button type="button" onClick={draft.resetSeed} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
          {String(t('manageReset'))}
        </button>
        <button type="button" onClick={draft.exportJson} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
          {String(t('manageExport'))}
        </button>
      </div>
    </section>
  )
}
