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
| Run tests | `npm test` |
| Coverage report | `npm run test:coverage` |
| Lint | `npm run lint` |
| Format | `npm run format` |

## Docker

```bash
docker build -t outfitte-frontend .
docker run -p 8080:80 outfitte-frontend
```

The multi-stage Dockerfile builds with Node 22 Alpine and serves the static output from Nginx on port 80.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Base URL for API requests |

In development, add a proxy rule to `vite.config.ts` to forward `/api` to a local backend. In Docker, Nginx proxies `/api/` to `http://backend:8080` — configure the `backend` hostname in `nginx.conf`.

## Links

- [Backend repo](https://github.com/Outfitte/backend)
- [Deploy repo](https://github.com/Outfitte/deploy)

## License

[AGPL-3.0](LICENSE)
