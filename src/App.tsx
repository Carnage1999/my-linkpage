import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
} from '@headlessui/react'
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from 'framer-motion'
import { startTransition, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppLanguageCode } from './i18n'
import { PROFILE, SOCIALS } from './siteConfig'
import { SocialIcon } from './SocialIcon'
import { SEO } from './components/SEO'

interface LanguageOption {
  code: AppLanguageCode
  label: string
  shortLabel: string
}

const LANGUAGES = [
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'ru', label: 'Русский', shortLabel: 'РУ' },
  { code: 'zh-TW', label: '正體中文', shortLabel: '國' },
] as const satisfies readonly LanguageOption[]

type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme'

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'dark') {
      return 'dark'
    }

    if (savedTheme === 'light') {
      return 'light'
    }
  } catch {
    return null
  }

  return null
}

function getInitialTheme(): boolean {
  const storedTheme = getStoredTheme()

  if (storedTheme) {
    return storedTheme === 'dark'
  }

  if (typeof window === 'undefined') {
    return false
  }

  return getSystemPrefersDark()
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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isDark, setIsDark] = useState<boolean>(getInitialTheme)
  const copyTimeoutRef = useRef<number | null>(null)
  const activeLanguage =
    LANGUAGES.find(
      ({ code }) => code === (i18n.resolvedLanguage ?? i18n.language)
    ) ?? LANGUAGES[0]

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)

    return undefined
  }, [isDark])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    if (getStoredTheme()) {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDark(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const changeTheme = (nextIsDark: boolean) => {
    setIsDark(nextIsDark)

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? 'dark' : 'light')
    } catch {
      return undefined
    }

    return undefined
  }

  useEffect(() => {
    try {
      const lang = i18n.resolvedLanguage ?? i18n.language
      document.documentElement.lang = lang
      document.title = String(t('pageTitle'))
    } catch {
      return undefined
    }

    return undefined
  }, [i18n.language, i18n.resolvedLanguage, t])

  useEffect(
    () => () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    },
    []
  )

  const changeLanguage = (languageCode: AppLanguageCode) => {
    startTransition(() => {
      void i18n.changeLanguage(languageCode)
    })

    try {
      localStorage.setItem('i18nextLng', languageCode)
    } catch {
      return undefined
    }
  }

  async function copyLink(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url)

      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current)
      }

      setCopiedId(id)
      copyTimeoutRef.current = window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      window.prompt(String(t('copy')), url)
    }
  }

  const prefersReduced = useReducedMotion()

  const fade = prefersReduced
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 } }

  const slideUp = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 32 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        },
      }

  return (
    <LazyMotion features={domAnimation} strict>
    <SEO />
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <a
        href="#social-links"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg dark:focus:bg-white dark:focus:text-slate-950"
      >
        {String(t('skipToContent'))}
      </a>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <m.div
          className="absolute left-1/2 top-0 size-72 translate-x-[-135%] rounded-full bg-amber-300/45 blur-3xl dark:bg-cyan-400/20"
          animate={
            prefersReduced
              ? undefined
              : { x: ['-135%', '-125%', '-135%'], y: [0, 18, 0] }
          }
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <m.div
          className="absolute right-0 top-24 size-80 translate-x-1/3 rounded-full bg-rose-300/35 blur-3xl dark:bg-fuchsia-500/15"
          animate={
            prefersReduced
              ? undefined
              : { x: ['33%', '25%', '33%'], y: [0, -14, 0] }
          }
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <m.div
          className="absolute bottom-0 left-1/2 size-96 -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl dark:bg-indigo-500/20"
          animate={
            prefersReduced
              ? undefined
              : { x: ['-50%', '-45%', '-50%'], y: [0, -20, 0] }
          }
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <main
        className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-5rem)]"
        aria-labelledby="profile-title"
      >
        <m.section
          className="grid w-full min-w-0 max-w-5xl gap-4 rounded-[2rem] border border-white/50 bg-white/70 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 dark:shadow-black/30 sm:gap-6 sm:p-4 lg:grid-cols-[minmax(20rem,1.02fr)_minmax(22rem,0.98fr)] lg:p-6"
          {...slideUp}
        >
          <m.div
            className="relative min-w-0 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl shadow-slate-950/30 sm:p-8"
            {...fade}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.3),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(125,211,252,0.22),_transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8 sm:gap-10">
              <div className="space-y-5 sm:space-y-6">
                <div className="grid w-full gap-3 sm:grid-cols-3">
                  <div className="inline-flex h-[46px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/75 shadow-sm">
                    <span className="size-2.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(110,231,183,0.14)]" />
                    Link Page
                  </div>

                  <Listbox
                    value={activeLanguage.code}
                    onChange={changeLanguage}
                    aria-label={String(t('language'))}
                  >
                    <div className="relative min-w-0">
                      <ListboxButton className="relative inline-flex h-[46px] w-full min-w-0 items-center justify-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/75 shadow-sm transition hover:border-amber-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 dark:hover:border-cyan-300 dark:focus-visible:ring-cyan-300">
                        <span className="block w-full truncate px-8 text-center">
                          {activeLanguage.shortLabel}
                        </span>
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                          <ChevronIcon />
                        </span>
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

                  <div className="inline-flex h-[46px] w-full min-w-0 items-center justify-center rounded-full border border-white/15 bg-white/10 px-3 text-sm font-medium text-white shadow-sm">
                    <Switch
                      checked={isDark}
                      onChange={changeTheme}
                      className="group inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-white/15 bg-white/10 px-0.5 transition data-[checked]:border-amber-300 data-[checked]:bg-amber-300/90 dark:data-[checked]:border-cyan-300 dark:data-[checked]:bg-cyan-300/85"
                    >
                      <span className="sr-only">{String(t('theme'))}</span>
                      <span className="flex size-6 translate-x-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition group-data-[checked]:translate-x-5 group-data-[checked]:bg-slate-950 group-data-[checked]:text-amber-300 dark:group-data-[checked]:text-cyan-300">
                        {isDark ? <MoonIcon /> : <SunIcon />}
                      </span>
                    </Switch>
                  </div>
                </div>

                <div className="space-y-4">
                  <m.img
                    src={PROFILE.avatar}
                    alt={String(t('avatarAlt'))}
                    width={96}
                    height={96}
                    fetchPriority="high"
                    className="size-20 rounded-[1.35rem] border border-white/10 object-cover shadow-lg shadow-black/20 ring-4 ring-white/10 sm:size-24 sm:rounded-[1.6rem]"
                    {...(prefersReduced
                      ? {}
                      : {
                          initial: { opacity: 0, scale: 0.8 },
                          animate: { opacity: 1, scale: 1 },
                          transition: {
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                            delay: 0.3,
                          },
                        })}
                  />

                  <div className="space-y-3">
                    <h1
                      className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.6rem]"
                      id="profile-title"
                    >
                      {String(t('title'))}
                    </h1>
                  </div>
                </div>

                <m.div
                  className="max-w-lg rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6"
                  {...(prefersReduced
                    ? {}
                    : {
                        initial: { opacity: 0, y: 16 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.5, delay: 0.45 },
                      })}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                    {String(t('aboutMe'))}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-200 sm:text-[0.95rem]">
                    {String(t('intro'))}
                  </p>
                </m.div>
              </div>
            </div>
          </m.div>

          <m.div
            className="flex min-w-0 flex-col justify-between gap-6 rounded-[1.75rem] bg-white/65 p-4 dark:bg-slate-900/60 sm:p-6"
            {...fade}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="truncate font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {String(t('subtitle'))}
                </h2>
              </div>
            </div>

            <ul className="grid min-w-0 gap-4" aria-label={String(t('subtitle'))} id="social-links">
              {SOCIALS.map((social, index) => (
                <li key={social.id} className="block w-full min-w-0">
                  <m.div
                    className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-black/10 sm:p-5"
                    {...(prefersReduced
                    ? {}
                    : {
                        initial: { opacity: 0, x: 24 },
                        animate: { opacity: 1, x: 0 },
                        transition: {
                          duration: 0.4,
                          delay: 0.35 + index * 0.08,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      })}
                  whileHover={
                    prefersReduced
                      ? undefined
                      : {
                          y: -4,
                          transition: { type: 'spring', stiffness: 400, damping: 25 },
                        }
                  }
                  whileTap={prefersReduced ? undefined : { scale: 0.985 }}
                >
                  <div className="absolute inset-y-0 left-0 w-1 -translate-x-full bg-gradient-to-b from-amber-300 via-orange-400 to-rose-400 transition duration-300 group-hover:translate-x-0 dark:from-cyan-300 dark:via-sky-400 dark:to-indigo-500" />
                  <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-5">
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-3 sm:gap-4"
                      aria-label={`${social.label} (${String(t('opensInNewTab'))})`}
                    >
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-slate-950 text-white shadow-lg shadow-slate-900/20 transition group-hover:rotate-3 group-hover:scale-105 dark:bg-white dark:text-slate-950">
                        <SocialIcon slug={social.iconSlug} />
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block text-lg font-semibold text-slate-950 dark:text-white">
                          {social.label}
                        </span>
                        <span className="block truncate whitespace-nowrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                          {social.url}
                        </span>
                      </span>
                    </a>

                    <div className="flex flex-wrap items-center gap-3 pl-[4.25rem] sm:pl-[4.5rem] xl:justify-self-end xl:pl-0">
                      <div className="relative">
                        <AnimatePresence>
                          {copiedId === social.id ? (
                            <m.div
                              aria-live="polite"
                              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                              initial={prefersReduced ? undefined : { opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
                              transition={{ duration: 0.2 }}
                            >
                              {String(t('copied'))}
                            </m.div>
                          ) : null}
                        </AnimatePresence>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-950 dark:focus-visible:ring-cyan-400 dark:focus-visible:ring-offset-slate-950"
                          onClick={() => copyLink(social.url, social.id)}
                          aria-label={`${String(t('copy'))} ${social.label}`}
                        >
                          {String(t('copy'))}
                        </button>
                      </div>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-500">
                        {String(t('visit'))}
                      </span>
                    </div>
                  </div>
                  </m.div>
                </li>
              ))}
            </ul>

            <div className="flex min-h-7 flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400" aria-label={String(t('builtWithLabel'))}>
                <span aria-hidden="true">{String(t('builtWith'))}</span>
              </p>
              <div className="min-h-0" />
            </div>
          </m.div>
        </m.section>
      </main>
    </div>
    </LazyMotion>
  )
}
