# Architecture rules
- All video/backend calls go through `src/services/videoService.ts`, which re-exports `videoServiceManager` choosing REAL (`realVideoService`, Windows Video Service V2) or DEMO (`mockVideoService`) at runtime — components never call fetch directly, so the app works without the service.
- Video service URLs come only from `src/config/videoServiceConfig.ts` (VITE_ env vars); service-returned media URLs pass through `src/utils/videoUrl.ts` so local Windows paths never reach the browser.
- Operator state lives in `src/lib/operator-store.ts` (useSyncExternalStore store + actions) — one source of truth, no provider needed.
- Theme is dark-only; tokens are defined in the override `:root` block at the end of `src/styles.css`.
