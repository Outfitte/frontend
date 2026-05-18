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

## Naming

- **Components**: PascalCase (`LoginPage.tsx`, `AppLayout.tsx`). Page files get a `Page` suffix.
- **Hooks**: kebab-case files (`use-auth.ts`), camelCase exports (`useLogin`, `useRegister`)
- **Utilities / stores / config**: kebab-case files (`query-client.ts`, `api.ts`, `auth.ts`)
- **Directories**: kebab-case
- All shared domain types are exported from `src/types/index.ts`

## Adding shadcn components

```bash
npx shadcn add <component-name>
```

Components land in `src/components/ui/` and are managed by the CLI — avoid hand-editing them; prefer overriding via CSS variables or wrapper components. Configuration is in `components.json`.

## API client

`src/lib/api.ts` wraps `fetch` and exposes:

```typescript
api.get<T>(path)
api.post<T>(path, body)
api.patch<T>(path, body)
api.delete<T>(path)
api.upload<T>(path, formData) // multipart/form-data — skips JSON Content-Type, goes through same auth/retry pipeline
```

- Base URL: always `/api` (see `constants.ts`); proxied to `BACKEND_URL` at the Vite dev server or nginx layer
- Auth: Bearer token injected automatically from `useAuthStore.getState()`
- Errors: throws `ApiError` with a `.status` property; 401 triggers a token refresh (singleton `inflightRefresh` prevents concurrent refreshes)
- 204 responses return `undefined`
- **Never call `fetch` directly in hooks** — always go through `api.*` so auth, retry, and error handling are consistent

## TanStack Query conventions

- **Query keys**: breadcrumb-style arrays — `['admin', 'settings']`, `['users', userId]`
- **Queries**: plain `useQuery` calls; `queryFn` calls an `api.*` method directly
- **Mutations**: always type at least `TData` and `TError`; add `TVariables` and `TContext` when using optimistic updates
- **Cache invalidation**: always call `queryClient.invalidateQueries()` in `onSettled`, not `onSuccess` — this ensures the cache refreshes after both success and error
- **Optimistic updates**:
  1. `onMutate` — cancel in-flight queries, snapshot old data, apply optimistic update, return snapshot as context
  2. `onError` — roll back using the context snapshot; call `toast.error()`
  3. `onSettled` — `queryClient.invalidateQueries()` to refetch
- Keep query and mutation hooks private to the module that uses them unless shared across pages

## Form patterns (react-hook-form + Zod + shadcn)

```typescript
// 1. Schema
const schema = z.strictObject({
  email: z.string().min(1, { error: 'Email is required' }).email({ error: 'Invalid email format' }),
  password: z.string().min(1, { error: 'Password is required' }),
})

// 2. Hook
const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(schema),
})

// 3. JSX — noValidate is required
<form onSubmit={handleSubmit(onSubmit)} noValidate>
  <Input {...register('email')} />
  {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
</form>
```

- Use `z.strictObject()` / `z.looseObject()` (not `.strict()` / `.passthrough()`)
- Use `{ error: "..." }` (not `{ message: "..." }`) in Zod v4
- Cross-field validation via `.refine()` with an explicit `path` array
- Every `<form>` must have `noValidate` (see Testing section for why)

## Zustand store conventions

```typescript
const STORAGE_KEY = 'foo-store-value'

interface FooState {
  value: string | null
  setValue: (v: string) => void
}

export const useFooStore = create<FooState>(() => ({
  value: null,
  setValue: (v) => {
    localStorage.setItem(STORAGE_KEY, v)
    useFooStore.setState({ value: v })
  },
}))
```

- Actions live inside the store initialiser (not `set` callback style)
- Call `useStoreName.setState()` inside actions
- Only sync to `localStorage` in the action(s) responsible for persistence; other state mutations just call `setState`
- Hydrate from storage via an explicit action (`hydrateFromStorage`, `initTheme`, etc.) called at app mount
- Prefer `useStore(s => s.field)` selectors for primitive values; actions and function refs don't need selectors

## Testing

- Use `render` from `@/test/utils` (not bare `@testing-library/react`) so tests run with `QueryClientProvider` and `MemoryRouter`
- Write failure/error cases before the happy path
- Test names follow `<Subject> should <expectation> when <condition>`
- Use explicit readable values (`'alice@example.com'`, `'Submit'`) — not empty defaults
- Forms that use react-hook-form must have `noValidate`; JSDOM enforces native HTML5 constraint validation (e.g. `type="email"`) and blocks the submit event before the hook's resolver runs
- Route-level pages must have `data-testid="<name>-page"` on their root element — `App.routing.test.tsx` uses these to verify routing
- Mock all API calls with MSW handlers in `src/test/mocks/handlers.ts`. The server (`src/test/setup.ts`) is configured with `onUnhandledRequest: 'error'`, so unmocked requests fail loudly

## TDD workflow

1. Write one failing test
2. Write the minimal production code to make it pass
3. Refactor, then repeat

Never write multiple tests up front. Never implement the full body before each individual test is red. Every implementation task includes tests; coverage thresholds are enforced (`npm run test:coverage`).

## Dependencies

- Import from `react-router` only — `react-router-dom` is deprecated in v7 and not installed
- Zod v4: use `z.strictObject()`/`z.looseObject()` (not `.strict()`/`.passthrough()`), and `{ error: "..." }` (not `{ message: "..." }`)
- Toast: use the thin wrapper in `src/lib/toast.ts` (`toast.error()`, `toast.success()`, `toast.info()`) — do not import from `sonner` directly
- Class merging: use `cn()` from `src/lib/utils.ts` (wraps `clsx` + `tailwind-merge`)

## Running the project

| Task              | Command                 |
| ----------------- | ----------------------- |
| Dev server        | `npm run dev`           |
| Production build  | `npm run build`         |
| Preview build     | `npm run preview`       |
| Run tests (once)  | `npm test`              |
| Run tests (watch) | `npm run test:watch`    |
| Coverage report   | `npm run test:coverage` |
| Lint              | `npm run lint`          |
| Lint + autofix    | `npm run lint:fix`      |
| Format            | `npm run format`        |
| Check formatting  | `npm run format:check`  |

### Docker

```bash
docker build -t frontend .
docker run -p 8080:80 frontend
```

The multi-stage Dockerfile builds with Node 22 Alpine then serves the static output from Nginx on port 80.

## Proxy configuration

A single `BACKEND_URL` environment variable controls the backend proxy target in both dev and prod. The app itself always calls `/api` — `BASE_URL` in `constants.ts` is the literal string `'/api'`.

**Development:** Set `BACKEND_URL` in your shell or a `.env` file (see `.env.example`). `vite.config.ts` reads `process.env.BACKEND_URL` and forwards `/api` to that URL:

```bash
BACKEND_URL=http://localhost:3000 npm run dev
```

**Production (Docker):** `nginx.conf.template` uses `${BACKEND_URL}` as the proxy target. The official nginx image runs `envsubst` automatically on files in `/etc/nginx/templates/` at container startup — no custom entrypoint needed. Set the variable in `deploy/docker-compose.yml` or via your orchestrator:

```yaml
environment:
  BACKEND_URL: http://backend:8080
```

## Path alias

`@` resolves to `src/` (configured in `vite.config.ts` and `vitest.config.ts`).
