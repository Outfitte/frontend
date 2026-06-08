# Contributing to Outfitte Frontend

Thank you for your interest in contributing. Please read this guide before opening a pull request.

## Contributor Licence Agreement

By submitting a pull request you agree that your contribution is made under the project's [AGPL-3.0-only](LICENSE) licence, and you grant Outfitte a perpetual, irrevocable, worldwide, royalty-free licence to use, reproduce, modify, and distribute your contribution as part of this project. If you are contributing on behalf of an employer, ensure you have the authority to do so.

## Development setup

```bash
git clone https://github.com/Outfitte/frontend.git
cd frontend
npm install
BACKEND_URL=http://localhost:3000 npm run dev
```

See [README.md](README.md) for the full environment and Docker setup.

## TDD workflow

All code changes must follow the red-green-refactor cycle:

1. Write **one failing test** that describes the behaviour you are about to add.
2. Write the **minimal production code** that makes that test pass — no more.
3. Refactor if needed, keeping all tests green.
4. Repeat from step 1 for the next behaviour.

Rules:

- Never write multiple tests upfront.
- Never implement the full function body before each individual test is red.
- Write failure/error-case tests before the happy-path test.
- Every implementation task must include tests; no untested code lands on `main`.

## Testing with MSW

All API calls are mocked with [MSW](https://mswjs.io/). Handlers live in `src/test/mocks/handlers.ts`.

The test server is configured with `onUnhandledRequest: 'error'`, so any request without a matching handler causes the test to fail loudly. Add a handler for every API endpoint your code calls.

```typescript
// src/test/mocks/handlers.ts
http.get('/api/users/me', () =>
  HttpResponse.json({ id: 1, email: 'alice@example.com' })
)
```

Use `render` from `@/test/utils` (not bare `@testing-library/react`) so tests run with `QueryClientProvider` and `MemoryRouter` pre-wired.

## Coverage gate

CI enforces a **90% line coverage** threshold via Vitest's `coverage.thresholds.lines` setting (lines only; branches and statements are not thresholded). Run coverage locally before pushing:

```bash
npm run test:coverage
```

If line coverage drops below 90% the CI job will fail and the PR cannot merge.

## Lint and formatting

All code must pass ESLint and Prettier before merging:

```bash
npm run lint        # ESLint (includes eslint-plugin-jsx-a11y)
npm run format:check
```

Auto-fix most issues with:

```bash
npm run lint:fix
npm run format
```

**jsx-a11y** rules are enforced at lint time. Every interactive element must be keyboard-accessible and have an accessible name.

## Pull request checklist

- [ ] Branch named `<username>/<issue-number>-short-description`
- [ ] Commit message: `<issue-number>: one sentence description`
- [ ] PR title: `<issue-number>: short description`
- [ ] PR body includes `Closes #<issue-number>`
- [ ] All tests pass (`npm test`)
- [ ] Coverage gate passes (`npm run test:coverage`)
- [ ] Lint and formatting pass (`npm run lint && npm run format:check`)
