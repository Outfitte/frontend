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
- Forms that use react-hook-form must have `noValidate`; JSDOM enforces native HTML5 constraint validation (e.g. `type="email"`) and blocks the submit event before the hook's resolver runs
- Route-level pages must have `data-testid="<name>-page"` on their root element — `App.routing.test.tsx` uses these to verify routing

## Dependencies

- Import from `react-router` only — `react-router-dom` is deprecated in v7 and not installed
- Zod v4: use `z.strictObject()`/`z.looseObject()` (not `.strict()`/`.passthrough()`), and `{ error: "..." }` (not `{ message: "..." }`)

## Path alias

`@` resolves to `src/` (configured in `vite.config.ts` and `vitest.config.ts`).
