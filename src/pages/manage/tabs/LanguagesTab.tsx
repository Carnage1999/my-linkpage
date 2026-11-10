import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { bundledValue, PERSONAL_KEYS, PUBLIC_KEYS, type PublicKey } from '../../../i18n/publicCopy'
import { fieldClass, type SiteDraft } from '../useSiteDraft'

const LABELS = {
  pageTitle: 'manageKeyPageTitle',
  title: 'manageKeyTitle',
  subtitle: 'manageKeySubtitle',
  aboutMe: 'manageKeyAboutMe',
  intro: 'manageKeyIntro',
  avatarAlt: 'manageKeyAvatarAlt',
  builtWith: 'manageKeyBuiltWith',
  builtWithLabel: 'manageKeyBuiltWithLabel',
  visit: 'manageKeyVisit',
  copy: 'manageKeyCopy',
  copied: 'manageKeyCopied',
  language: 'manageKeyLanguage',
  theme: 'manageKeyTheme',
  lightMode: 'manageKeyLightMode',
  darkMode: 'manageKeyDarkMode',
  skipToContent: 'manageKeySkip',
  opensInNewTab: 'manageKeyNewTab',
} as const satisfies Record<PublicKey, string>

const GROUPS = [
  { title: 'manageLangPersonal' as const, keys: PERSONAL_KEYS },
  { title: 'manageLangChrome' as const, keys: PUBLIC_KEYS.filter((key) => !PERSONAL_KEYS.includes(key)) },
]

export function LanguagesTab({ draft }: { draft: SiteDraft }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(draft.i18n.fallback)
  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [shortLabel, setShortLabel] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const active = draft.i18n.languages.some((language) => language.code === selected) ? selected : draft.i18n.fallback
  const needle = query.trim().toLowerCase()
  const placeholderFor = (key: PublicKey) => bundledValue(active, key) || bundledValue(draft.i18n.fallback, key)

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/80">
      <div className="space-y-2">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">{String(t('manageTabLanguages'))}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{String(t('manageLangLead'))}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{String(t('manageLangRtl'))}</p>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          className="mt-1"
          checked={draft.i18n.detect}
          onChange={(event) => draft.setDetect(event.target.checked)}
        />
        <span>
          {String(t('manageLangDetect'))}
          <span className="mt-1 block text-xs text-slate-500">{String(t('manageLangDetectHint'))}</span>
        </span>
      </label>

      <ul className="space-y-2">
        {draft.i18n.languages.map((language, index) => (
          <li key={language.code} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
            <button
              type="button"
              className={`min-h-11 rounded-lg px-2 text-sm font-medium ${active === language.code ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-700 dark:text-slate-200'}`}
              aria-pressed={active === language.code}
              onClick={() => setSelected(language.code)}
            >
              {language.shortLabel} · {language.label}
            </button>
            <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="radio"
                name="homepage-fallback"
                checked={draft.i18n.fallback === language.code}
                onChange={() => draft.setFallback(language.code)}
              />
              {String(t('manageLangFallback'))}
            </label>
            <button type="button" className="text-sm text-slate-500 underline disabled:opacity-40" disabled={index === 0} onClick={() => draft.moveLanguage(index, -1)}>
              {String(t('manageLangUp'))}
            </button>
            <button
              type="button"
              className="text-sm text-slate-500 underline disabled:opacity-40"
              disabled={index === draft.i18n.languages.length - 1}
              onClick={() => draft.moveLanguage(index, 1)}
            >
              {String(t('manageLangDown'))}
            </button>
            <button
              type="button"
              className="text-sm text-slate-500 underline disabled:opacity-40"
              disabled={draft.i18n.languages.length <= 1}
              onClick={() => draft.removeLanguage(language.code)}
            >
              {String(t('manageLangRemove'))}
            </button>
          </li>
        ))}
      </ul>

      <form
        className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          const result = draft.addLanguage(code, label, shortLabel)
          if (!result.ok) {
            setAddError(String(t(result.error === 'duplicate' ? 'manageLangDuplicate' : 'manageLangInvalid')))
            return
          }
          setAddError(null)
          setSelected(result.code)
          setCode('')
          setLabel('')
          setShortLabel('')
        }}
      >
        <input className={fieldClass} value={code} placeholder={String(t('manageLangCode'))} aria-label={String(t('manageLangCode'))} onChange={(event) => setCode(event.target.value)} />
        <input className={fieldClass} value={label} placeholder={String(t('manageLangName'))} aria-label={String(t('manageLangName'))} onChange={(event) => setLabel(event.target.value)} />
        <input className={fieldClass} value={shortLabel} placeholder={String(t('manageLangShort'))} aria-label={String(t('manageLangShort'))} onChange={(event) => setShortLabel(event.target.value)} />
        <button type="submit" className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
          {String(t('manageLangAdd'))}
        </button>
      </form>
      {addError ? <p className="text-sm text-red-500">{addError}</p> : null}

      <div className="space-y-3">
        <p className="text-sm text-slate-500">{String(t('manageLangFallbackHint'))}</p>
        <label className="block text-sm text-slate-600 dark:text-slate-300">
          {String(t('manageLangSearch'))}
          <input className={fieldClass} value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        {GROUPS.map((group) => {
          const keys = group.keys.filter((key) => {
            if (!needle) return true
            const placeholder = placeholderFor(key)
            const value = draft.i18n.overrides[active]?.[key] ?? ''
            return key.includes(needle) || String(t(LABELS[key])).toLowerCase().includes(needle) || placeholder.toLowerCase().includes(needle) || value.toLowerCase().includes(needle)
          })
          if (keys.length === 0) return null
          return (
            <div key={group.title} className="space-y-3">
              <h3 className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">{String(t(group.title))}</h3>
              {keys.map((key) => {
                const value = draft.i18n.overrides[active]?.[key] ?? ''
                const placeholder = placeholderFor(key)
                const multiline = key === 'intro'
                return (
                  <div key={key} className="grid gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm text-slate-600 dark:text-slate-300" htmlFor={`copy-${active}-${key}`}>
                        {String(t(LABELS[key]))}
                      </label>
                      <button
                        type="button"
                        className="text-xs text-slate-500 underline disabled:opacity-40"
                        disabled={!value}
                        onClick={() => draft.setOverride(active, key, '')}
                      >
                        {String(t('manageLangReset'))}
                      </button>
                    </div>
                    {multiline ? (
                      <textarea
                        id={`copy-${active}-${key}`}
                        className={fieldClass}
                        rows={3}
                        value={value}
                        placeholder={placeholder}
                        onChange={(event) => draft.setOverride(active, key, event.target.value)}
                      />
                    ) : (
                      <input
                        id={`copy-${active}-${key}`}
                        className={fieldClass}
                        value={value}
                        placeholder={placeholder}
                        onChange={(event) => draft.setOverride(active, key, event.target.value)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {draft.status ? <p className="text-sm text-slate-500">{draft.status}</p> : null}
      <button type="button" disabled={draft.saving} onClick={draft.save} className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
        {draft.saving ? String(t('manageSaving')) : String(t('manageSave'))}
      </button>
    </section>
  )
}
