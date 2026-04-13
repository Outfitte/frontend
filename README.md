# Outfitte Frontend

Web frontend for [Outfitte](https://github.com/Outfitte).

## Stack

- **React 19** with TypeScript
- **Vite** — build tool and dev server
- **Tailwind CSS v4** — utility-first styling
- **shadcn/ui** — component primitives
- **TanStack Query** — server state management
- **Zustand** — client state management
- **React Router v7** — client-side routing
- **Vitest + Testing Library + MSW** — testing

## Prerequisites

- Node.js 22+
- npm

## Quick start

```bash
npm install
npm run dev
```

## Commands

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

## Docker

```bash
docker build -t frontend .
docker run -p 8080:80 frontend
```

The multi-stage Dockerfile builds with Node 22 Alpine and serves the static output from Nginx on port 80.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Base URL for API requests |

In development, add a proxy rule to `vite.config.ts` to forward `/api` to a local backend:

```typescript
server: {
  proxy: { '/api': 'http://localhost:3000' },
},
```

In Docker, Nginx proxies `/api/` and `/media/` to `http://backend:8080` — configure the `backend` hostname in `nginx.conf`.

## Links

- [Backend repo](https://github.com/Outfitte/backend)
- [Deploy repo](https://github.com/Outfitte/deploy)

## License

[AGPL-3.0](LICENSE)
