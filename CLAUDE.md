# CLAUDE.md

## Git conventions

- Branch: `<username>/<number>-short-name` (2–4 lowercase hyphenated words)
- Commit: `<number>: one sentence description`
- PR title: `<number>: short description`
- PR body must include `Closes #<number>`

## Directory structure

```
src/
├── components/
│   ├── ui/          # shadcn/ui primitives (managed by CLI)
│   │   └── __tests__/
│   ├── layout/      # Shell, Sidebar, Header
│   └── shared/      # Reusable app-level components
├── pages/           # Route-level page components
│   └── __tests__/
├── hooks/           # Custom React hooks
│   └── __tests__/
├── lib/             # Utilities, API client, constants
│   └── __tests__/
├── stores/          # Zustand stores
│   └── __tests__/
├── test/            # Test infrastructure only (setup, mocks, utils)
│   └── mocks/       # MSW handlers, server, fixtures
├── types/           # Shared TypeScript types
├── App.tsx
├── main.tsx
└── index.css
```

`__tests__/` directories are co-located with the code they test. Test files follow `<module>.test.ts(x)`.

`src/test/` is for test infrastructure only — not for component or unit tests.

## Testing

- Use `render` from `@/test/utils` (not bare `@testing-library/react`) so tests run with `QueryClientProvider` and `MemoryRouter`
- Write failure/error cases before the happy path
- Test names follow `<Subject> should <expectation> when <condition>`
- Use explicit readable values (`'alice@example.com'`, `'Submit'`) — not empty defaults

## Path alias

`@` resolves to `src/` (configured in `vite.config.ts` and `vitest.config.ts`).
