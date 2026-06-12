import { getRunTimeEnv, normalizeBaseUrl } from '#@/constants/env.ts'

/**
 * Base URL (subpath) support — single source of truth.
 *
 * The whole app is written as if it were served from the site root ("/"). To host it under a
 * subpath (e.g. https://example.com/retro), set RETROASSEMBLY_RUN_TIME_BASE_URL=/retro. Two things
 * then happen:
 *
 *  1. Build time (vite.config.ts) — Vite's `base` is set to the path, so every emitted asset URL and
 *     the client-side React Router basename are baked with the prefix. Nothing else in the app code
 *     needs to know about the base on the client.
 *
 *  2. Run time — React Router matches the base-prefixed paths natively via the configured
 *     `basename` (react-router.config.ts), so its pages need no special handling. The non-RR Hono
 *     pieces (API, robots) are mounted under the base, static assets are looked up with
 *     {@link stripBase}, the bare origin "/" redirects to the base, and any server that emits a
 *     browser-facing URL (auth/login/logout/OAuth redirects) wraps it with {@link withBase}.
 *
 * Future maintainers: routes stay root-relative; reach for `withBase` only when producing a URL the
 * browser will navigate to, and `stripBase` when matching an incoming request path against an
 * app-relative route. The base is intentionally Node-only; workerd/Cloudflare deploys at the root.
 */

/** The base path the app is served under (e.g. '/retro'), or '' when served at the root. */
export function getBaseUrl() {
  return normalizeBaseUrl(getRunTimeEnv().RETROASSEMBLY_RUN_TIME_BASE_URL)
}

/** Prefix an app-absolute path (e.g. '/library') with the base URL for a browser-facing URL. */
export function withBase(pathname: string) {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    return pathname
  }
  return `${baseUrl}${pathname.startsWith('/') ? '' : '/'}${pathname}`
}

/** Strip the base URL prefix from a request pathname, yielding the app-relative path. */
export function stripBase(pathname: string) {
  const baseUrl = getBaseUrl()
  if (baseUrl && (pathname === baseUrl || pathname.startsWith(`${baseUrl}/`))) {
    return pathname.slice(baseUrl.length) || '/'
  }
  return pathname
}
