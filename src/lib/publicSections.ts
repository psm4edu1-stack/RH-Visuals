export const PUBLIC_SECTION_IDS = ['home', 'work', 'services', 'contact'] as const

export type PublicSectionId = (typeof PUBLIC_SECTION_IDS)[number]

export function isPublicSectionId(value: string): value is PublicSectionId {
  return (PUBLIC_SECTION_IDS as readonly string[]).includes(value)
}

export function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

export function publicSectionScrollTop(section: PublicSectionId) {
  const element = document.getElementById(section)
  if (!element) return null

  const header = document.querySelector<HTMLElement>('.site-header')
  const headerOffset = header ? Math.ceil(header.getBoundingClientRect().height) + 8 : 0
  return Math.max(0, element.getBoundingClientRect().top + window.scrollY - headerOffset)
}

export function scrollToPublicSection(
  section: PublicSectionId,
  behavior: ScrollBehavior = preferredScrollBehavior(),
) {
  const top = publicSectionScrollTop(section)
  if (top === null) return false

  window.scrollTo({ top, behavior })
  return true
}
