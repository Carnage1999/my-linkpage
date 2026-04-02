import { FALLBACK_ICON_PATH, ICON_MAP } from './iconRegistry'

export function SocialIcon({
  slug,
  className = 'size-5',
}: {
  slug?: string
  className?: string
}) {
  const icon = slug ? ICON_MAP[slug] : undefined

  if (icon) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        <path d={icon.path} />
      </svg>
    )
  }

  // Fallback: generic link icon
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={FALLBACK_ICON_PATH} />
    </svg>
  )
}
