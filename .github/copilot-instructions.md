# RTA Studio - AI Agent Guide

- Workspace: two apps share Supabase; [rtastudio](rtastudio) mobile (Expo 54, RN 0.81, NativeWind) and [rtastudio-v2](rtastudio-v2) web (Next.js 14 App Router, Tailwind/shadcn, Yjs). Keep changes scoped per app.
- Key docs: [rtastudio/.github/README.md](rtastudio/.github/README.md) for the mobile WebView integration + commands; top-level [.github](.github) holds QUICK_START_COMMANDS, TESTING_CHECKLIST, ENVIRONMENT_TESTING_GUIDE, test-integration.sh.
- Package managers: pnpm throughout; avoid yarn. Expo CLI drives mobile tasks.

## Mobile (rtastudio)
- Routing: Expo Router under [rtastudio/app](rtastudio/app); [rtastudio/app/%28tabs%29/_layout.tsx](rtastudio/app/%28tabs%29/_layout.tsx) defines tab bar; dynamic routes in [rtastudio/app/explore/%5Bid%5D.tsx](rtastudio/app/explore/%5Bid%5D.tsx) and [rtastudio/app/project/%5BprojectId%5D.tsx](rtastudio/app/project/%5BprojectId%5D.tsx).
- Styling: NativeWind className strings only; colors from [rtastudio/constants/Colors.ts](rtastudio/constants/Colors.ts); avoid StyleSheet and ad-hoc hex unless defined.
- Auth: Web-based login flow in [rtastudio/auth/index.ts](rtastudio/auth/index.ts) storing session in SecureStore; read user via `useAuthUser()` from [rtastudio/lib/auth-store.ts](rtastudio/lib/auth-store.ts) instead of direct `supabase.auth.getUser()`.
- Data: Supabase client singleton [rtastudio/lib/supabase.ts](rtastudio/lib/supabase.ts); fetchers live in [rtastudio/data](rtastudio/data); project helpers in [rtastudio/lib/projects.ts](rtastudio/lib/projects.ts); handle null data and RLS errors explicitly.
- WebView integration: Project screen loads external editor with utilities in [rtastudio/utils/webview-integration.ts](rtastudio/utils/webview-integration.ts); headers include `x-react-native-webview`; validate project UUID; run [.github/test-integration.sh](.github/test-integration.sh) when touching it.
- Run/test: `pnpm install`; `pnpm dev` (menu), `pnpm web`, `pnpm android`, `pnpm ios`, `pnpm test` (jest-expo). Env uses `EXPO_PUBLIC_*` keys (Supabase URL/anon key, WEB_AUTH_URL, WEB_EDITOR_URL).

## Web (rtastudio-v2)
- App Router; most components are `"use client"`. Server-only pieces: layouts, API routes, middleware [rtastudio-v2/middleware.ts](rtastudio-v2/middleware.ts). SSR auth handled via Supabase cookies.
- Supabase: client singleton [rtastudio-v2/lib/supabase/client.ts](rtastudio-v2/lib/supabase/client.ts); storage helpers in [rtastudio-v2/lib/supabase/storage.ts](rtastudio-v2/lib/supabase/storage.ts); server client in middleware. Always filter by user (RLS on projects, project_collaborators, invitations, profiles).
- Collaboration: Yjs/WebRTC stack in [rtastudio-v2/lib/collaborative](rtastudio-v2/lib/collaborative); create one provider per project, await `whenSynced`; fallback signaling via Supabase Realtime.
- Rendering: Canvas renderers [rtastudio-v2/lib/plaidmaker-renderer.ts](rtastudio-v2/lib/plaidmaker-renderer.ts) and [rtastudio-v2/lib/realistic-texture-renderer.ts](rtastudio-v2/lib/realistic-texture-renderer.ts); layer composition in [rtastudio-v2/app/project/%5Bid%5D/page.tsx](rtastudio-v2/app/project/%5Bid%5D/page.tsx) and [rtastudio-v2/components/layer-manager.tsx](rtastudio-v2/components/layer-manager.tsx); thumbnails via [rtastudio-v2/components/mini-canvas-thumbnail.tsx](rtastudio-v2/components/mini-canvas-thumbnail.tsx).
- UI pattern: Control panels (`-controls.tsx`) are stateless and emit callbacks; canvases (`-canvas.tsx`) manage refs; layer types: TextileLayer, MotifLayer, MotifPlaidLayer. Fiber types are fixed (cotton/wool/silk/linen/blend).
- Run: `pnpm install`; `pnpm dev`; `pnpm build`; `pnpm start`; `pnpm lint` (build errors ignored in next.config). Env: Supabase URL/anon key + Google client id in `.env.local`.

## Shared patterns
- Path alias `@/` in both apps; TypeScript strict; minimize `any` except Yjs internals.
- Error handling: use toast (react-native-toast-message mobile, Sonner web) and prefix console logs with a component tag; guard against null Supabase responses even on success.
- Collaboration vs fetch: Mobile fetches Supabase per screen (no caching); web relies on Yjs for state, with manual Supabase persistence.
- Testing/troubleshooting: consult [.github](.github) docs/scripts (test-integration.sh, QUICK_START_COMMANDS, TESTING_CHECKLIST, ENVIRONMENT_TESTING_GUIDE) before deep debugging.
- Gotchas: Deep linking scheme `rtastudio-app` in app.json; NativeWind requires pure class strings; Yjs mutations are async; SVG export incomplete; next.config ignores build errors; WebView requires valid project UUID and header for 404 handling.
