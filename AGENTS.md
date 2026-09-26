# Architecture rules
- All video/backend calls go through `src/services/videoService.ts` (VideoService contract); components never call fetch directly — so the mock can be swapped for the local FastAPI+FFmpeg service.
- Operator state lives in `src/lib/operator-store.ts` (useSyncExternalStore store + actions) — one source of truth, no provider needed.
- Theme is dark-only; tokens are defined in the override `:root` block at the end of `src/styles.css`.
