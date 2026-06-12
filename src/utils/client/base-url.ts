/**
 * Client-side base URL helper for RAW browser navigations (location.replace/assign, manual URL
 * building, non-router asset links) where React Router is not involved and therefore does not apply
 * its basename.
 *
 * React Router links/navigations and loader redirects already get the basename automatically, so
 * only reach for this when bypassing the router. The base is read at run time from
 * `globalThis.RETROASSEMBLY_BASE_URL` — set on the server at startup (so it works during SSR) and
 * streamed to the browser by an inline bootstrap script in <head> (so it is available before
 * hydration). The value mirrors RETROASSEMBLY_RUN_TIME_BASE_URL; see utils/server/base-url.ts.
 */
export function withClientBase(pathname: string) {
  const base = ((globalThis as { RETROASSEMBLY_BASE_URL?: string }).RETROASSEMBLY_BASE_URL || '').replace(/\/$/u, '')
  if (!pathname.startsWith('/')) {
    return pathname
  }
  return `${base}${pathname}`
}
