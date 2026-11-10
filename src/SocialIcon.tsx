import { FALLBACK_ICON_PATH } from './icons/paths'
import { safeSvgPath } from './lib/safeUrl'

export function SocialIcon({
  path,
  className = 'size-5',
}: {
  path?: string
  className?: string
}) {
  const drawn = safeSvgPath(path)

  if (drawn) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        <path d={drawn} />
      </svg>
    )
  }

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
