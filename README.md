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
```

3. Run `npm run dev` and open http://localhost:3000.

Without service credentials, the UI still renders, data endpoints return HTTP 503, and sign-in explains that configuration is missing. No sample records are inserted. Existing tables and email/WhatsApp integrations are preserved.

## Interface

- Shared desktop sidebar and phone bottom navigation with safe-area spacing.
- Searchable assignments, course and deadline filters, expandable instructions.
- Calendar-day deadline grouping: assignments due today remain visible all day.
- Shared accessible forms, browser validation, loading/error/success feedback.
- Admin search and management with failed deletions preserved in the list.
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

The inherited class-password gate is client-side, and existing privileged API routes do not enforce server-side authentication/roles. This UI rebuild does not constitute an authorization hardening pass; those routes should be secured before a public release. Registration stores `whatsapp_number`, while the existing reminder code reads `phone_number`; verify the database mapping before claiming WhatsApp delivery.
