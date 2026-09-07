# Project Memory

## Core
DreamPost: admin-run community app on Lovable Cloud. Admin controls posts, chat, member approval/restrictions.
Admin bootstrap credentials live in secrets ADMIN_BOOTSTRAP_USERNAME / ADMIN_BOOTSTRAP_PASSWORD — never hardcode them in code.
Never migrate off Supabase/Lovable Cloud (Firebase migration was assessed and rejected).

## Memories
- [Auth & moderation rules](mem://features/auth-moderation) — login flow, approval gating, profile guard triggers
