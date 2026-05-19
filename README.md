[![CI](https://github.com/Outfitte/frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Outfitte/frontend/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/Outfitte/frontend/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/Outfitte/frontend/actions/workflows/dependabot/dependabot-updates)
[![codecov](https://codecov.io/gh/Outfitte/frontend/graph/badge.svg?token=MV4MNYG4PT)](https://codecov.io/gh/Outfitte/frontend)

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

## Docker

```bash
docker build -t frontend .
docker run -p 8080:80 frontend
```

The multi-stage Dockerfile builds with Node 22 Alpine and serves the static output from Nginx on port 80.

## Environment variables

| Variable      | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `BACKEND_URL` | URL of the backend API server (used by Vite dev proxy and nginx) |

Copy `.env.example` to `.env` and set `BACKEND_URL`:

```bash
cp .env.example .env
# edit .env to set BACKEND_URL=http://localhost:3000
```

Or pass it inline:

```bash
BACKEND_URL=http://localhost:3000 npm run dev
```

In Docker, set `BACKEND_URL` via the environment. See `deploy/docker-compose.yml` for an example.

## Links

- [Backend repo](https://github.com/Outfitte/backend)
- [Deploy repo](https://github.com/Outfitte/deploy)

## License

[AGPL-3.0](LICENSE)
