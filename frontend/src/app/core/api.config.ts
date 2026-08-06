/**
 * Base URL of the Project FORGE API.
 *
 * Development: the Angular dev server runs on 4200 and the API on 4000.
 * Production:  nginx serves the app and proxies /api to the API container,
 *              so a same-origin relative path is correct. Same origin also
 *              means no CORS preflight and no cross-site cookie rules.
 *
 * window.__FORGE_API_BASE__ overrides both, for a split-domain deployment.
 */
function resolveApiBase(): string {
  const injected = (globalThis as { __FORGE_API_BASE__?: string }).__FORGE_API_BASE__;
  if (injected) return injected;

  if (typeof location !== 'undefined' && location.port === '4200') {
    return 'http://localhost:4000/api/v1';
  }
  return '/api/v1';
}

export const API_BASE = resolveApiBase();
