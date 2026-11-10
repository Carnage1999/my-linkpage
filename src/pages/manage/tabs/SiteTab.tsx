import { useManageCopy } from '../../../manage/useManageCopy'
import publicImages from '../../../generated/public-images.json'
import { safeAvatarUrl } from '../../../lib/safeAvatarUrl'
import { fieldClass, type SiteDraft } from '../useSiteDraft'

export function SiteTab({ draft }: { draft: SiteDraft }) {
  const { t } = useManageCopy()
  const preview = safeAvatarUrl(draft.avatarUrl.trim() ? draft.avatarUrl : draft.avatarPath)

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">{String(t('manageTabSite'))}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {String(t('manageName'))}
            <input className={fieldClass} value={draft.name} onChange={(event) => draft.patch({ name: event.target.value })} />
          </label>
          <p className="mt-1 text-xs text-slate-500">{String(t('manageDisplayNameHint'))}</p>
        </div>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {String(t('manageDomain'))}
          <input className={fieldClass} value={draft.domain} onChange={(event) => draft.patch({ domain: event.target.value })} />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {String(t('manageHandle'))}
          <input className={fieldClass} value={draft.handle} onChange={(event) => draft.patch({ handle: event.target.value })} />
        </label>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">{String(t('manageAvatar'))}</p>
        <div className="flex flex-wrap items-end gap-3">
          <img src={preview} alt="" className="size-16 rounded-full object-cover" />
          <div className="flex flex-wrap gap-2">
            {publicImages.map((path) => (
              <label key={path} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="radio"
                  name="avatar"
                  checked={!draft.avatarUrl && draft.avatarPath === path}
                  onChange={() => draft.patch({ avatarPath: path, avatarUrl: '' })}
                />
                <img src={path} alt="" className="size-8 rounded-full object-cover" />
              </label>
            ))}
          </div>
        </div>
        <label className="block text-sm text-slate-600 dark:text-slate-300">
          {String(t('manageAvatarCustom'))}
          <input
            className={fieldClass}
            value={draft.avatarUrl}
            placeholder="https://"
            onChange={(event) => draft.patch({ avatarUrl: event.target.value })}
          />
        </label>
      </div>
      {draft.status ? <p className="text-sm text-slate-500">{draft.status}</p> : null}
      <button type="button" disabled={draft.saving} onClick={draft.save} className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
        {draft.saving ? String(t('manageSaving')) : String(t('manageSave'))}
      </button>
    </section>
  )
}
