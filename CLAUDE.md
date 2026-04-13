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

Components land in `src/components/ui/` and are managed by the CLI — do not hand-edit them. Configuration is in `components.json`.

## API client

`src/lib/api.ts` wraps `fetch` and exposes:

```typescript
api.get<T>(path)
api.post<T>(path, body)
api.patch<T>(path, body)
api.delete<T>(path)
```

- Base URL: `VITE_API_URL` env var, defaults to `/api`
- Auth: Bearer token injected automatically from `useAuthStore.getState()`
- Errors: throws `ApiError` with a `.status` property; 401 triggers a token refresh (singleton `inflightRefresh` prevents concurrent refreshes)
- 204 responses return `undefined`

## TanStack Query conventions

- **Query keys**: breadcrumb-style arrays — `['admin', 'settings']`, `['users', userId]`
- **Queries**: plain `useQuery` calls; `queryFn` calls an `api.*` method directly
- **Mutations**: always typed with all four generics `useMutation<TData, TError, TVariables, TContext>`
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
- `noValidate` on every `<form>` — JSDOM enforces native HTML5 constraint validation and blocks submit before the resolver runs

## Zustand store conventions

```typescript
interface FooState {
  value: string | null
  setValue: (v: string) => void
}

export const useFooStore = create<FooState>(() => ({
  value: null,
  setValue: (v) => {
    localStorage.setItem(KEY, v)
    useFooStore.setState({ value: v })
  },
}))
```

- Actions live inside the store initialiser (not `set` callback style)
- Call `useStoreName.setState()` inside actions
- Sync with `localStorage` manually; hydrate via an explicit `hydrateFromStorage()` action called in `useEffect` at app mount
- Prefer `useStore(s => s.field)` selectors for primitive values to avoid unnecessary re-renders

## Testing

- Use `render` from `@/test/utils` (not bare `@testing-library/react`) so tests run with `QueryClientProvider` and `MemoryRouter`
- Write failure/error cases before the happy path
- Test names follow `<Subject> should <expectation> when <condition>`
- Use explicit readable values (`'alice@example.com'`, `'Submit'`) — not empty defaults
- Forms that use react-hook-form must have `noValidate`; JSDOM enforces native HTML5 constraint validation (e.g. `type="email"`) and blocks the submit event before the hook's resolver runs
- Route-level pages must have `data-testid="<name>-page"` on their root element — `App.routing.test.tsx` uses these to verify routing
- Mock all API calls with MSW handlers in `src/test/mocks/handlers.ts`; the server is configured with `onUnhandledRequest: 'error'` so unmocked requests fail loudly

## TDD workflow

1. Write one failing test
2. Write the minimal production code to make it pass
3. Refactor, then repeat

Never write multiple tests up front. Never implement the full body before each individual test is red. Every implementation task includes tests; coverage thresholds are enforced (`npx vitest run --coverage`).

## Dependencies

- Import from `react-router` only — `react-router-dom` is deprecated in v7 and not installed
- Zod v4: use `z.strictObject()`/`z.looseObject()` (not `.strict()`/`.passthrough()`), and `{ error: "..." }` (not `{ message: "..." }`)
- Toast: use the thin wrapper in `src/lib/toast.ts` (`toast.error()`, `toast.success()`, `toast.info()`) — do not import from `sonner` directly
- Class merging: use `cn()` from `src/lib/utils.ts` (wraps `clsx` + `tailwind-merge`)

## Running the project

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Preview build | `npm run preview` |
| Run tests (once) | `npm test` |
| Run tests (watch) | `npm run test:watch` |
| Coverage report | `npm run test:coverage` |
| Lint | `npm run lint` |
| Lint + autofix | `npm run lint:fix` |
| Format | `npm run format` |
| Check formatting | `npm run format:check` |

### Docker

```bash
docker build -t frontend .
docker run -p 8080:80 frontend
```

The multi-stage Dockerfile builds with Node 22 Alpine then serves the static output from Nginx on port 80.

## Proxy configuration

The API base URL is configured via the `VITE_API_URL` environment variable (default: `/api`). In development, add a proxy rule to `vite.config.ts` if you need to forward `/api` to a local backend:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3000',
  },
},
```

## Path alias

`@` resolves to `src/` (configured in `vite.config.ts` and `vitest.config.ts`).
