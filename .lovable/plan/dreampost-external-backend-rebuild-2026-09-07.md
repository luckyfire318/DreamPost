# DreamPost external-backend rebuild

## Goal
Create the new DreamPost app in the new Lovable project that is already connected to the user's external Supabase project, while preserving the existing DreamPost appearance and feature set.

## Prerequisite
The new project is not currently visible in this workspace, so implementation must begin after that project is opened or made accessible in the same workspace. The current Cloud-backed project will remain unchanged and will not be repointed.

## Scope
- Port the existing DreamPost visual design, logo, theme system, responsive layouts, member navigation, admin navigation, crop flows, protected media presentation, and pull-to-refresh behavior.
- Reconnect all client and server code to the new project's generated external-Supabase integration; do not reuse the current project's Cloud environment values or hardcoded credentials.
- Align the external database with the app's required data model: profiles, separate roles, approval/status controls, restrictions, posts, post media, likes, comments, messages, settings, and chat classification.
- Preserve server-side authorization: database-backed admin roles, approval gates, post/message restrictions, hidden posts, admin-only moderation, private member/admin chat, and deletion permissions.
- Set up and verify email/password authentication, signup approval flow, session restoration, logout, password reset, email verification handling, protected routes, and profile loading.
- Configure private Storage buckets and policies for avatars, post media, and chat media, including signed access, media size limits, downloadable admin media where supported, and no public exposure of private files.
- Configure Realtime subscriptions with a shared subscription, cleanup on unmount, and live updates for posts, moderation, members, likes, comments, and chat messages.
- Generate fresh database types from the connected external project and update queries to match the verified schema rather than assuming the old Cloud schema.
- Remove bootstrap credentials and any Cloud-only assumptions; use secure server-side configuration for any required admin initialization.

## Migration and data handling
- Inspect the external project's existing tables, columns, relationships, policies, storage buckets, auth settings, and existing rows before changing anything.
- Preserve existing external data. Add only missing DreamPost schema, policies, indexes, functions, grants, or storage rules required by the app.
- If the external project already contains equivalent tables, map the app to them instead of creating duplicates.
- Do not copy credentials or private keys into source code, and do not overwrite unrelated external-project data.

## Verification
- Confirm the app loads on public, member, and admin entry points.
- Test signup, email confirmation state, login, logout, password reset, protected redirects, and profile/session hydration.
- Test approval, suspension, post restriction, messaging restriction, hidden-post visibility, and admin-only controls through database-backed permissions.
- Test post creation with multiple images/video, free-size cropping, comments, likes, media access, chat text/media, admin deletion, chat background, themes, and admin inbox classification.
- Verify Realtime updates and subscription cleanup, Storage access, mobile and desktop layouts, console/runtime errors, and a production build.

## Technical implementation
- Work only in the new project after it is accessible; keep the current project untouched.
- Use the existing TanStack Start architecture and route structure rather than introducing another router or app shell.
- Use the connected project's generated client, auth middleware, server functions, and database types.
- Keep protected routes under the authenticated layout and keep sensitive operations server-validated with RLS and server functions.
