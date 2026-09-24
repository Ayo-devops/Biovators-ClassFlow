# ClassFlow

A mobile-first classroom workspace built with Next.js 16, React 19, Tailwind CSS 4 and Supabase.

## Run locally

1. Run `npm ci`.
2. Create `.env.local` with your existing service configuration:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
BREVO_API_KEY=
WHATSAPP_API_URL=http://127.0.0.1:3001
WHATSAPP_API_KEY=
REMINDER_API_KEY=
CLASSFLOW_ADMIN_EMAILS=admin@example.com
```

`WHATSAPP_API_KEY` is the private key used by the ClassFlow server when it
calls the WhatsApp service. `REMINDER_API_KEY` is a separate bearer key for
authorizing scheduled or manual calls to `/api/send-reminders`; neither value
should use the `NEXT_PUBLIC_` prefix.

`CLASSFLOW_ADMIN_EMAILS` is a comma-separated server-only bootstrap allowlist.
It lets existing administrators use protected controls while their Supabase
accounts are migrated to trusted `app_metadata.role` values. New invitations
store their role in `app_metadata` automatically.

`GET /api/send-reminders` is always a dry run. Add `?studentId=<id>` to preview
one student. Delivery requires `POST` with either `{ "studentId": "..." }` for
a controlled test or `{ "confirmAll": true }` for the complete reminder list.
Automations authenticate with `Authorization: Bearer <REMINDER_API_KEY>`.
Admin controls instead send the signed-in user's Supabase access token, which
is verified server-side and never exposes the scheduler key in the browser.

Students who registered without a phone number can visit `/update-phone` and
verify ownership of their registration email through a Supabase magic link
before adding or replacing their WhatsApp number.

3. Run `npm run dev` and open http://localhost:3000.

Without service credentials, the UI still renders, data endpoints return HTTP 503, and sign-in explains that configuration is missing. No sample records are inserted. Existing tables and email/WhatsApp integrations are preserved.

## Interface

- Shared desktop sidebar and phone bottom navigation with safe-area spacing.
- Searchable assignments, course and deadline filters, expandable instructions.
- Calendar-day deadline grouping: assignments due today remain visible all day.
- Shared accessible forms, browser validation, loading/error/success feedback.
- Admin search and management with failed deletions preserved in the list.
- Server-authorized announcement deletion for administrators.
- A prominent, email-verified flow for adding or replacing reminder numbers.
- Reduced-motion support, keyboard focus styles, 16px mobile inputs.

## Progressive web app

The manifest, 192px/512px icons, maskable icon and Apple icon enable home-screen installation on supported browsers. Serve through HTTPS in production (localhost also works).

The service worker registers only in production. Test with `npm run build` followed by `npm start`. Android/Chromium offers the native install prompt when available; iPhone users receive Safari Share → Add to Home Screen instructions. Standalone installations hide the install action.

Offline navigation displays a dedicated reconnect screen. This version does not cache assignment data, authenticated pages, or API responses, queue submissions, or add push notifications. Email/WhatsApp reminders remain separate from PWA installation.

## Verification

```sh
npm run lint
npm run build
node scripts/check-core.mjs
```

Core checks cover calendar boundaries, manifest icon dimensions, online/offline navigation behavior, and exclusion of API calls and mutations from service-worker caching. Icons can be regenerated with `node scripts/generate-icons.cjs` (uses Next.js's installed sharp dependency).

## Existing integration limitations

Live sign-in, database writes, invites and message delivery require the existing credentials and external services. They cannot be verified from this checkout without that configuration. The WhatsApp integration currently calls a separate service on port 3001.

The inherited class-password gate is client-side. Student-list access,
student deletion, invitations, and reminder delivery now enforce server-side
administrator authorization; the remaining privileged mutations should be
migrated to the same pattern. The registration API maps the form's
`whatsapp_number` field to the existing `students.phone_number` column used by
reminders.
