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

## Development

The app always calls `/api` for backend requests. In dev, Vite proxies `/api` and `/media` to `BACKEND_URL`:

```bash
BACKEND_URL=http://localhost:3000 npm run dev
```

Alternatively, copy `.env.example` to `.env` and set `BACKEND_URL` there:

```bash
cp .env.example .env
# edit .env: BACKEND_URL=http://localhost:3000
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

CI enforces a **90% line coverage threshold** (`vitest.config.ts`). `npm run test:coverage` must pass before merging.

## Docker

```bash
docker build -t frontend .
docker run -p 8080:80 -e BACKEND_URL=http://backend:8080 frontend
```

The multi-stage Dockerfile builds with **node:26-alpine** and serves the static output from **nginx**. Nginx:

- Serves the React SPA with a `try_files` fallback for client-side routing
- Proxies `/api/` → `${BACKEND_URL}/` (strips the `/api` prefix)
- Proxies `/media/` → `${BACKEND_URL}/media/`
- Caches hashed assets for 1 year; sets `no-cache` on `index.html`

Set `BACKEND_URL` in your environment or orchestrator. See the [deploy repo](https://github.com/Outfitte/deploy) for a full self-hosting setup with Docker Compose.

## Authentication and token strategy

- **Access token** — kept in memory only (Zustand store). Never written to `localStorage` or cookies. Lost on page reload; a silent refresh restores it from the refresh token.
- **Refresh token** — persisted in `localStorage` under the key `refresh_token`. On app load `hydrateFromStorage` exchanges it for a fresh access token.

**XSS trade-off:** storing the refresh token in `localStorage` means a successful XSS attack could steal it and maintain persistent access. The mitigation is a strict Content Security Policy that prevents inline script execution and restricts script sources to `'self'`. See [SECURITY.md](SECURITY.md) for the full CSP rationale and the responsible-disclosure process.

## Self-hosting

See the [deploy repo](https://github.com/Outfitte/deploy) for Docker Compose configuration, environment variable reference, and operator guidance (TLS termination, HSTS, reverse proxy setup).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability reporting process and security architecture notes.

## License

[AGPL-3.0-only](LICENSE)
