# ClassFlow

**Biovators, connected.**

ClassFlow is the shared academic workspace for Biovators. It brings our assignments, deadlines, announcements, reminders, and WhatsApp communication into one calm, mobile-friendly place.

[Open the live app](https://biovators-class-flow.vercel.app)

## What ClassFlow does

- Keeps assignments, deadlines, priorities, and submission details together.
- Publishes announcements to the noticeboard and registered students by email.
- Sends assignments and deadline reminders by email and WhatsApp.
- Lets workspace members send confirmed messages to approved WhatsApp groups.
- Gives students a secure way to add or replace their reminder number.
- Supports private one-student delivery tests before a class-wide message.
- Works as an installable progressive web app with an offline fallback page.
- Provides role-based access for the Super Admin, administrators, and course representatives.

## Workspace roles

| Role | Access |
| --- | --- |
| Super Admin | Full workspace access, including invitations, role review, and access revocation |
| Administrator | Student management, reminders, private delivery tests, content deletion, and WhatsApp group messaging |
| Course Representative | Assignment creation, announcements, and WhatsApp group messaging |

Permissions are enforced by the server. Hiding an action in the interface is not used as the security boundary.

## Architecture

| Service | Responsibility |
| --- | --- |
| Next.js app on Vercel | User interface, API routes, authentication checks, and delivery orchestration |
| Supabase | Authentication and storage for students, assignments, and announcements |
| Brevo | Transactional email delivery |
| OCI WhatsApp worker | Persistent `whatsapp-web.js` session, direct messages, group messages, and the Gemini chat assistant |

The WhatsApp worker is a separate long-running Node.js service. This repository communicates with it over an authenticated HTTPS API; worker credentials remain server-side.

## Tech stack

- Next.js 16 and React 19
- Supabase Auth and Database
- Brevo transactional email
- `whatsapp-web.js` worker hosted on Oracle Cloud Infrastructure
- Vercel deployment and analytics
- Progressive Web App support

## Getting started

### Prerequisites

- Node.js 20 or later
- npm
- A configured Supabase project
- A Brevo API key for email features
- Access to the ClassFlow WhatsApp worker for WhatsApp features

### Installation

```bash
git clone https://github.com/Ayo-devops/Biovators-ClassFlow.git
cd Biovators-ClassFlow
npm ci
```

Create `.env.local` in the project root:

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

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without the external service credentials, the interface still renders, but connected data and delivery features report that configuration is unavailable. The application does not insert sample records automatically.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by the browser and server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key used for browser authentication |
| `SUPABASE_SECRET_KEY` | Server-only Supabase key for protected data and user management |
| `BREVO_API_KEY` | Server-only key for transactional email |
| `WHATSAPP_API_URL` | HTTPS URL of the WhatsApp worker in production |
| `WHATSAPP_API_KEY` | Server-only credential used to authenticate worker requests |
| `REMINDER_API_KEY` | Private bearer token for trusted reminder automations |
| `CLASSFLOW_ADMIN_EMAILS` | Comma-separated bootstrap allowlist for Super Admin accounts |

Never expose a secret by adding the `NEXT_PUBLIC_` prefix. Keep production values in Vercel environment variables and the worker’s protected server environment—not in Git.

## Supabase data

The application expects three main tables:

- `students` for names, email addresses, and optional WhatsApp numbers
- `assignments` for course, deadline, lecturer, priority, submission, and instruction details
- `announcements` for noticeboard messages and their authors

Workspace roles are stored in trusted Supabase `app_metadata.role` values. The supported invited roles are `admin` and `rep`; addresses in `CLASSFLOW_ADMIN_EMAILS` are treated as `super_admin`.

## Useful commands

```bash
npm run dev                 # Start local development
npm run build               # Create a production build
npm start                   # Run the production build
npm run lint                # Run ESLint
node scripts/check-core.mjs # Check core PWA and deadline behavior
```

Registration behavior can be checked separately with:

```bash
node scripts/check-registration.mjs
```

## Reminder safety

`GET /api/send-reminders` is preview-only and never sends a message. A specific student can be previewed with `?studentId=<id>`.

Actual delivery requires `POST` with either:

```json
{ "studentId": "student-id" }
```

or an explicit class-wide confirmation:

```json
{ "confirmAll": true }
```

Trusted automations authenticate with `Authorization: Bearer <REMINDER_API_KEY>`. Admin actions use the signed-in user’s verified Supabase access token instead.

## Deployment

The production web application deploys to Vercel from the `main` branch. Configure all required environment variables in the Vercel project before deploying.

The WhatsApp worker remains on OCI because Chromium and `whatsapp-web.js` require a persistent process and authenticated browser session. In production, `WHATSAPP_API_URL` must point to its secure HTTPS endpoint rather than `127.0.0.1`.

Build locally before pushing:

```bash
npm run lint
npm run build
```

## Security notes

- Supabase access tokens and trusted role metadata protect workspace operations.
- Student data, reminder delivery, private tests, deletions, and team management have role-specific authorization.
- WhatsApp group IDs are checked server-side before delivery.
- Group sends require explicit confirmation in the browser.
- Student phone-number updates require email verification.
- API keys and service-role credentials must remain server-side.

## Project status

ClassFlow is live and actively used by Biovators. The web application, email delivery, WhatsApp integration, role-based workspace, and AI WhatsApp assistant are operational.
