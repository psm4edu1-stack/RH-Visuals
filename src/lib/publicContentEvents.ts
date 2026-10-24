export const PUBLIC_CONTENT_UPDATED_EVENT = 'rhv:public-content-updated'

/**
 * Notify mounted public sections that an authenticated admin has saved or
 * published portfolio/service content. Public pages also refetch on window
 * focus, which covers the same content opened in another tab.
 */
export function notifyPublicContentUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PUBLIC_CONTENT_UPDATED_EVENT))
}
