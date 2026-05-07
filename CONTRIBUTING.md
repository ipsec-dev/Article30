# Contributing

Thanks for your interest in contributing. This project is an open-source GDPR / RGPD registry;

Pull requests, feature requests, bug reports, and security disclosures are all welcome.

## Before you start

- For non-trivial changes, open an issue first so we can align on scope.
- For security issues, please **do not** open a public issue, follow the process in [`SECURITY.md`](./SECURITY.md).

## Development setup

See `README.md` for the full Quick Start.

## Branch and commit style

- Branch from `main`: `git checkout -b feature/short-name` or `fix/short-name`.
- Commit messages try to follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`...
- Keep commits focused; one logical change per commit.
- Reference issues in the commit body when relevant (`Closes #123`).

## Required local checks

Run the full local check set before every push.
CI runs the same steps and will fail the PR if any of them fails.

```bash
pnpm lint            # ESLint across all packages
pnpm format:check    # Prettier - no writes
pnpm typecheck       # tsc --noEmit across all packages
pnpm build           # Production build of shared + backend + frontend
pnpm test            # Backend Vitest suite (Postgres must be running)
pnpm --filter @article30/backend test:coverage  # backend coverage report (requires Postgres + Redis)
```

## Code style

- Avoid `any` unless justified with an eslint-disable and a comment explaining why.
- Prefer editing existing files over adding new ones.
- Default to writing no comments (only when the _why_ is non-obvious)
- Don't explain _what_ the code does, well-named identifiers already do that.
- Keep functions small and focused. Split when a file grows unfocused.

## Testing

- Backend: add a Vitest spec under `backend/test/` for any new service, controller, or pipeline.
- Prefer integration tests against a real Postgres over heavy mocking.
- Frontend: add a Vitest spec under `frontend/test/` for components and lib helpers; add a Playwright e2e under `frontend/e2e/` for new user flows.

## Pull request checklist

- [ ] Prisma schema changes come with a migration (`pnpm db:migrate`).
- [ ] `CHANGELOG.md` updated under `## [Unreleased]`.
- [ ] Docs updated if behaviour changed (`README.md`, or an in `docs/` for larger changes).
- [ ] No personal data, secrets, or absolute paths introduced.

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0-only](./LICENSE) license.
