# Mobile app modules

This folder is intentionally split into small modules.

- `lib/auth/`: Authentication and Supabase session state (single source of truth)
- `lib/data/`: Data fetching + caching + providers

Expo Router requires routes to live under `app/` at the project root.
