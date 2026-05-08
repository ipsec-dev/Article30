# Article30

Web application for managing a GDPR/RGPD processing activities register (Article 30).

The data model is **Article 30 turned into code** - a typed schema, DPO validation workflow, tamper-evident audit log, and structured links between the register and the operational surfaces (DSR intake, vendor DPAs, breach log, DPIA screening) that exercise it. See [Project overview](https://github.com/ipsec-dev/Article30/wiki/Home) for the full framing and Article 30 mapping.

---

## Features

- **Processing Register** - Create, import, edit, validate, and export GDPR Article 30 treatment records
- **DSR Management** - Intake and track Data Subject Requests with deadlines
- **Violation Tracking** - Log data breaches with severity, CNIL notification status, and remediation
- **Vendor Register** - Manage processors/sub-processors with DPA status and risk assessments
- **Per-treatment checklist** - Guided screening on a single treatment yielding a compliance verdict
- **Governance posture** - Organization-wide self-assessment across breach, governance, transfers and records
- **Regulatory Watch** - Ingest RSS feeds (CNIL, EDPB by default) and track regulatory updates
- **Document Library** - Upload policies, DPAs, and evidence to S3-compatible storage (presigned URLs)
- **Alerts** - Surface upcoming deadlines (DSR response, treatment reviews, notifications)
- **Regulation Reference** - Browse GDPR recitals and articles in 5 languages (FR, EN, ES, DE, IT)
- **Glossary** - 86 RGPD acronyms, concepts, roles, processes, and adjacent compliance frameworks
- **Audit Log** - Tamper-evident hash-chained trail of every mutation with old/new values
- **User Management** - Invite-only auth with role-based access (5 roles)
- **Organization Settings** - Company, representative, and DPO information
- **Bilingual UI** - French and English (per-browser preference, cross-tab sync)

---

## Quick Start (production and testing)

```bash
git clone <repo-url>
cd article30
cp .env.prod.example .env.prod
# Edit .env.prod
docker compose --env-file .env.prod up -d
docker compose --env-file .env.prod --profile admin run --rm -e ALLOW_SEED=1 backend-tools seed  # first run only
```

This pulls `ghcr.io/ipsec-dev/article30/{backend,frontend}` from GitHub Container Registry. No build step on the deploy host.

| Service     | URL                     |
| ----------- | ----------------------- |
| Frontend    | <http://localhost:3000> |
| Backend API | <http://localhost:3001> |

For required hardening (reverse proxy with TLS, firewalled datastore ports, secret rotation, backups), version pinning + upgrades, and the build-from-source path, see [Production Deployment](https://github.com/ipsec-dev/Article30/wiki/Production).

## Quick Start (development)

```bash
git clone <repo-url>
cd article30
pnpm install
cp .env.dev.example .env.dev
ln -s ../.env.dev backend/.env  # so Prisma & Nest find env vars from backend/
docker compose -f docker-compose.yml -f build/dev.compose.yml --env-file .env.dev up -d postgres redis rustfs mailpit
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

For an explained walkthrough of each step, see [Local Development](https://github.com/ipsec-dev/Article30/wiki/Development).

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
| Object store | RustFS                              |
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
