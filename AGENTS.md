# Architecture rules
- All video/backend calls go through `src/services/videoService.ts`, which re-exports `videoServiceManager` using REAL (`realVideoService`, Windows Video Service) by default and DEMO (`mockVideoService`) only via the explicit Settings toggle — never a silent fallback — components never call fetch directly, so the app works without the service.
- Video service URLs come only from `src/config/videoServiceConfig.ts` (VITE_ env vars); service-returned media URLs pass through `src/utils/videoUrl.ts` so local Windows paths never reach the browser.
- Operator state lives in `src/lib/operator-store.ts` (useSyncExternalStore store + actions) — one source of truth, no provider needed.
- Theme is dark-only; tokens are defined in the override `:root` block at the end of `src/styles.css`.
