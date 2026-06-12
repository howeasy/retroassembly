/**
 * Client-side base URL helper for RAW browser navigations (location.replace/assign, manual URL
 * building) where React Router is not involved and therefore does not apply its basename.
 *
 * React Router links/navigations and loader redirects already get the basename automatically, so
 * only reach for this when bypassing the router. `import.meta.env.BASE_URL` is the Vite base
 * ('/retro/' or '/') baked at build time. See utils/server/base-url.ts for the server-side model.
 */
export function withClientBase(pathname: string) {
  const base = import.meta.env.BASE_URL || '/'
  if (!pathname.startsWith('/')) {
    return pathname
  }
  return `${base.replace(/\/$/u, '')}${pathname}`
}
