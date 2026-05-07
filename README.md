# Article30

Open-source, self-hostable web application for managing a GDPR/RGPD processing activities register (Article 30).

The data model is **Article 30 turned into code** - a typed schema, DPO validation workflow, tamper-evident audit log, and structured links between the register and the operational surfaces (DSR intake, vendor DPAs, breach log, DPIA screening) that exercise it. See [Project overview](https://github.com/ipsec-dev/Article30/wiki/Home) for the full framing and Article 30 mapping.

---

## Features

- **Processing Register** - Create, edit, validate, and export GDPR Article 30 treatment records; bootstrap import via XLSX template
- **DSR Management** - Intake and track Data Subject Requests (access, rectification, erasure, portability, objection, restriction) with deadlines
- **Violation Tracking** - Log data breaches with severity, CNIL notification status, and remediation
- **Vendor Register** - Manage processors/sub-processors with DPA status and risk assessments
- **Per-treatment checklist (`/checklist`)** - Guided screening on a single treatment yielding a compliance verdict; convertible to a register entry
- **Governance posture (`/governance`)** - Organization-wide self-assessment across breach notification, processor management, DPO governance, international transfers, and records / accountability
- **Regulatory Watch** - Ingest RSS feeds (CNIL, EDPB by default) and track regulatory updates
- **Document Library** - Upload policies, DPAs, and evidence to S3-compatible storage (presigned URLs)
- **Alerts** - Surface upcoming deadlines (DSR response, treatment reviews, notifications)
- **Regulation Reference** - Browse GDPR recitals and articles in 5 languages (FR, EN, ES, DE, IT)
- **Glossary** - 86 RGPD acronyms, concepts, roles, processes, and adjacent compliance frameworks (ISO 27001/27701, NIS2, eIDAS, …), FR + EN, with search and category filters
- **Audit Log** - Tamper-evident hash-chained trail of every mutation with old/new values
- **User Management** - Invite-only auth with role-based access (5 roles), out-of-band reset URLs, and admin password reset
- **Organization Settings** - Company, representative, and DPO information
- **Bilingual UI** - French and English (per-browser preference, cross-tab sync)

---

## Quick Start (development)

```bash
git clone <repo-url>
cd article30
pnpm install
cp .env.dev.example .env.dev
ln -s ../.env.dev backend/.env  # so Prisma & Nest find env vars from backend/
docker compose -f docker-compose.yml -f dev/compose.yml --env-file .env.dev up -d postgres redis rustfs mailpit
pnpm db:migrate && pnpm seed
pnpm dev
```

| Service        | URL                              |
| -------------- | -------------------------------- |
| Frontend       | <http://localhost:3000>          |
| Backend API    | <http://localhost:3001>          |
| Swagger docs   | <http://localhost:3001/api/docs> |
| RustFS console | <http://localhost:9001>          |
| MailPit inbox  | <http://localhost:8025>          |

The first user to sign up automatically gets the **Admin** role.

For an explained walkthrough of each step (macOS/WSL specifics, the dockerized-dev alternative, stopping the stack cleanly), see [Local Development](https://github.com/ipsec-dev/Article30/wiki/Development).

## Quick Start (production)

```bash
git clone <repo-url>
cd article30
cp .env.prod.example .env.prod
# Edit .env.prod and set DB_PASSWORD, REDIS_PASSWORD, SESSION_SECRET,
# AUDIT_HMAC_SECRET, S3_*, SMTP_*, CORS_ORIGIN, FRONTEND_URL,
# NEXT_PUBLIC_API_URL placeholders.
docker compose --env-file .env.prod up -d --build
docker compose --env-file .env.prod exec backend pnpm seed  # first-time only
```

| Service     | URL                     |
| ----------- | ----------------------- |
| Frontend    | <http://localhost:3000> |
| Backend API | <http://localhost:3001> |

To pull pre-built release images from GHCR instead of building locally, see [Pulling release images](https://github.com/ipsec-dev/Article30/wiki/Production#pulling-release-images).

For required hardening (reverse proxy with TLS, firewalled datastore ports, secret rotation, `NODE_ENV=production`, `COOKIE_SECURE=true`, backups), see [Production Deployment](https://github.com/ipsec-dev/Article30/wiki/Production).

---

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Monorepo     | pnpm workspaces                     |
| Backend      | NestJS (TypeScript)                 |
| Frontend     | Next.js (App Router)                |
| Database     | PostgreSQL 18                       |
| ORM          | Prisma                              |
| Sessions     | Redis 8                             |
| Object store | RustFS (S3-compatible)              |
| API          | REST + OpenAPI (generated client)   |
| UI           | Tailwind CSS + shadcn/ui            |
| Deployment   | Docker Compose (per-service images) |

---

## Documentation

- [Home](https://github.com/ipsec-dev/Article30/wiki/Home) - project overview + GDPR Article 30 mapping
- [Development](https://github.com/ipsec-dev/Article30/wiki/Development) - manual setup, dockerized-dev alternative, seed data, project structure
- [Production](https://github.com/ipsec-dev/Article30/wiki/Production) - required hardening, known gaps, password recovery
- [Authentication](https://github.com/ipsec-dev/Article30/wiki/Authentication) - signup, invite, login, forgotten-password (SMTP-on/off), role/permission matrix
- [Business](https://github.com/ipsec-dev/Article30/wiki/Business) - workflow constraints, audit logging
- [Logging](https://github.com/ipsec-dev/Article30/wiki/Logging) - JSON format, request correlation, redaction, env knobs
- [Contributing](https://github.com/ipsec-dev/Article30/wiki/Contributing) - Dependabot rhythm, Conventional Commits, release-please flow
