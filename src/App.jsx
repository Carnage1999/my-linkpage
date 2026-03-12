import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
} from '@headlessui/react'
import { startTransition, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const SOCIALS = [
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com/Carnage1999',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 .5C5.73.5.84 5.39.84 11.66c0 4.83 3.13 8.92 7.47 10.37.55.1.75-.24.75-.53 0-.26-.01-1.12-.02-2.02-3.04.66-3.68-1.47-3.68-1.47-.5-1.28-1.23-1.62-1.23-1.62-.99-.68.07-.67.07-.67 1.1.08 1.68 1.13 1.68 1.13.97 1.66 2.54 1.18 3.16.9.1-.7.38-1.18.69-1.45-2.43-.28-4.99-1.21-4.99-5.39 0-1.19.42-2.16 1.11-2.92-.11-.28-.48-1.4.11-2.92 0 0 .9-.29 2.95 1.11a10.2 10.2 0 012.69-.36c.91.01 1.83.12 2.68.36 2.05-1.4 2.95-1.11 2.95-1.11.59 1.52.22 2.64.11 2.92.69.76 1.11 1.74 1.11 2.92 0 4.18-2.57 5.11-5.01 5.38.39.34.74 1.02.74 2.06 0 1.49-.01 2.69-.01 3.06 0 .29.2.64.76.53 4.34-1.46 7.46-5.54 7.46-10.37C23.16 5.39 18.27.5 12 .5z"
          fill="currentColor"
        />
      </svg>
    ),
  },
]

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh-TW', label: '正體中文' },
]

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      return true
    }

    if (savedTheme === 'light') {
      return false
    }
  } catch {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L4.79 9.997a.75.75 0 111.06-1.06l3.073 3.072 6.72-6.719a.75.75 0 011.06 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
      <path
        d="M12 3v2.25M12 18.75V21M21 12h-2.25M5.25 12H3M18.364 5.636l-1.591 1.591M7.227 16.773l-1.591 1.591M18.364 18.364l-1.591-1.591M7.227 7.227 5.636 5.636M15.75 12A3.75 3.75 0 1 1 8.25 12a3.75 3.75 0 0 1 7.5 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
      <path
        d="M21 12.79A9 9 0 0 1 11.21 3c0 .27-.02.53-.02.8a9 9 0 0 0 9 9c.27 0 .53-.01.8-.01Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [copiedId, setCopiedId] = useState(null)
  const [isDark, setIsDark] = useState(getInitialTheme)
  const copyTimeoutRef = useRef(null)
  const activeLanguage =
    LANGUAGES.find(
      ({ code }) => code === (i18n.resolvedLanguage ?? i18n.language)
    ) ?? LANGUAGES[0]

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)

    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    } catch {
      return undefined
    }

    return undefined
  }, [isDark])

  useEffect(() => {
    try {
      document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language
    } catch {
      return undefined
    }

    return undefined
  }, [i18n.language, i18n.resolvedLanguage])

  useEffect(
    () => () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    },
    []
  )

  const changeLanguage = (languageCode) => {
    startTransition(() => {
      void i18n.changeLanguage(languageCode)
    })

    try {
      localStorage.setItem('i18nextLng', languageCode)
    } catch {
      return undefined
    }
  }

  async function copyLink(url, id) {
    try {
      await navigator.clipboard.writeText(url)

      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }

      setCopiedId(id)
      copyTimeoutRef.current = window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      window.prompt(t('copy'), url)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 size-72 translate-x-[-135%] rounded-full bg-amber-300/45 blur-3xl dark:bg-cyan-400/20" />
        <div className="absolute right-0 top-24 size-80 translate-x-1/3 rounded-full bg-rose-300/35 blur-3xl dark:bg-fuchsia-500/15" />
        <div className="absolute bottom-0 left-1/2 size-96 -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl dark:bg-indigo-500/20" />
      </div>

      <main
        className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-5rem)]"
        role="main"
        aria-labelledby="profile-title"
      >
        <section className="grid w-full max-w-5xl gap-4 rounded-[2rem] border border-white/50 bg-white/70 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 dark:shadow-black/30 sm:gap-6 sm:p-4 lg:grid-cols-[minmax(20rem,1.02fr)_minmax(22rem,0.98fr)] lg:p-6">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl shadow-slate-950/30 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.3),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(125,211,252,0.22),_transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8 sm:gap-10">
              <div className="space-y-5 sm:space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/75">
                  <span className="size-2 rounded-full bg-emerald-300" />
                  Link Page
                </div>

                <div className="space-y-4">
                  <img
                    src="/avatar.jpg"
                    alt="Avatar"
                    className="size-20 rounded-[1.35rem] border border-white/10 object-cover shadow-lg shadow-black/20 ring-4 ring-white/10 sm:size-24 sm:rounded-[1.6rem]"
                  />

                  <div className="space-y-3">
                    <p
                      className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.6rem]"
                      id="profile-title"
                    >
                      {t('title')}
                    </p>
                    <p className="max-w-md text-sm leading-6 text-slate-300 sm:text-base">
                      {t('subtitle')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                      {t('theme')}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {isDark ? t('darkMode') : t('lightMode')}
                    </p>
                  </div>

                  <Switch
                    checked={isDark}
                    onChange={setIsDark}
                    className="group inline-flex h-11 w-20 shrink-0 items-center rounded-full border border-white/10 bg-white/10 px-1 transition data-[checked]:bg-amber-300/90"
                  >
                    <span className="sr-only">{t('theme')}</span>
                    <span className="flex size-9 translate-x-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition group-data-[checked]:translate-x-9 group-data-[checked]:bg-slate-950 group-data-[checked]:text-amber-300">
                      {isDark ? <MoonIcon /> : <SunIcon />}
                    </span>
                  </Switch>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 rounded-[1.75rem] bg-white/65 p-4 dark:bg-slate-900/60 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Social
                </p>
                <h2 className="mt-3 break-words font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {t('subtitle')}
                </h2>
              </div>

              <Listbox value={activeLanguage.code} onChange={changeLanguage}>
                <div className="relative self-start md:shrink-0">
                  <ListboxButton className="inline-flex w-full max-w-full items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-white dark:focus-visible:ring-cyan-400 dark:focus-visible:ring-offset-slate-900 md:w-auto">
                    {activeLanguage.label}
                    <ChevronIcon />
                  </ListboxButton>

                  <ListboxOptions className="absolute right-0 z-10 mt-3 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950">
                    {LANGUAGES.map(({ code, label }) => (
                      <ListboxOption
                        key={code}
                        value={code}
                        className={({ focus }) =>
                          `flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${focus ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span>{label}</span>
                            {selected ? <CheckIcon /> : null}
                          </>
                        )}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </div>
              </Listbox>
            </div>

            <section className="grid gap-4" aria-label="links">
              {SOCIALS.map((social) => (
                <article
                  key={social.id}
                  className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/10 dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-black/10 dark:hover:border-cyan-400 dark:hover:shadow-cyan-500/10 sm:p-5"
                >
                  <div className="absolute inset-y-0 left-0 w-1 -translate-x-full bg-gradient-to-b from-amber-300 via-orange-400 to-rose-400 transition duration-300 group-hover:translate-x-0 dark:from-cyan-300 dark:via-sky-400 dark:to-indigo-500" />
                  <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-5">
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-3 sm:gap-4"
                      aria-label={`${social.label} link`}
                    >
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-slate-950 text-white shadow-lg shadow-slate-900/20 transition group-hover:rotate-3 group-hover:scale-105 dark:bg-white dark:text-slate-950">
                        {social.icon}
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block text-lg font-semibold text-slate-950 dark:text-white">
                          {social.label}
                        </span>
                        <span className="block truncate whitespace-nowrap text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {social.url}
                        </span>
                      </span>
                    </a>

                    <div className="flex flex-wrap items-center gap-3 pl-[4.25rem] sm:pl-[4.5rem] xl:justify-self-end xl:pl-0">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-950 dark:focus-visible:ring-cyan-400 dark:focus-visible:ring-offset-slate-950"
                        onClick={() => copyLink(social.url, social.id)}
                        aria-label={`${t('copy')} ${social.label}`}
                      >
                        {t('copy')}
                      </button>
                      <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                        {t('visit')}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <div className="flex min-h-7 flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('builtWith')}
              </p>
              <div
                aria-live="polite"
                className="text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400"
              >
                {copiedId ? t('copied') : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
