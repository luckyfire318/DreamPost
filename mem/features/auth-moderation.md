---
name: Auth and moderation rules
description: DreamPost login flow, approval gating and profile moderation-field protection
type: feature
---
- Login resolves username/gmail/admin-id and signs in fully server-side via `signInWithIdentifier` (src/lib/auth.functions.ts). Member email addresses must never be returned to the browser.
- First admin is bootstrapped from ADMIN_BOOTSTRAP_USERNAME/ADMIN_BOOTSTRAP_PASSWORD secrets, only when no admin role exists.
- `guard_profile_insert` and `guard_profile_update` triggers force non-admins to pending status, no restrictions, unlocked details, and block edits to status/restrictions/details_lock/email/username/accepted_terms.
- Realtime is a single shared channel (`src/lib/realtime.tsx`, mounted in `_authenticated/route.tsx`). Do not add per-component postgres_changes subscriptions.
