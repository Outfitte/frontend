# Security Policy

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately via [GitHub Security Advisories](https://github.com/Outfitte/frontend/security/advisories/new). Include:

- A clear description of the vulnerability and its impact
- Steps to reproduce or a proof-of-concept
- The version or commit you tested against

You should receive an acknowledgement within 72 hours. We will coordinate a fix and disclosure timeline with you.

## Security headers

The nginx template (`nginx.conf.template`) is being hardened with the following response headers as part of the F5 launch milestone. Once merged, these headers will be set on every response.

### Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none'
```

**Rationale:**

| Directive         | Value                    | Reason                                                                                               |
| ----------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `script-src`      | `'self'`                 | Blocks inline scripts and third-party script injection — the primary XSS defence.                    |
| `style-src`       | `'self' 'unsafe-inline'` | `'unsafe-inline'` is required for Radix UI / shadcn components that inject inline styles at runtime. |
| `img-src`         | `'self' data: blob:`     | `data:` and `blob:` are needed for upload previews and media thumbnails.                             |
| `frame-ancestors` | `'none'`                 | Prevents the app from being embedded in a frame (equivalent to `X-Frame-Options: DENY`).             |
| `object-src`      | `'none'`                 | Disables Flash and other plugin content.                                                             |

### Additional headers

| Header                   | Value                                      | Reason                                                                     |
| ------------------------ | ------------------------------------------ | -------------------------------------------------------------------------- |
| `X-Content-Type-Options` | `nosniff`                                  | Prevents MIME-type sniffing.                                               |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`          | Limits referrer leakage to cross-origin requests.                          |
| `X-Frame-Options`        | `DENY`                                     | Belt-and-suspenders framing protection alongside `frame-ancestors 'none'`. |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=()` | Opts out of sensitive browser APIs the app does not use.                   |

**Note on HSTS:** `Strict-Transport-Security` is intentionally absent from the nginx config. The container serves plain HTTP; HSTS must be set at the operator's TLS terminator (e.g. a reverse proxy or load balancer). See the [deploy repo](https://github.com/Outfitte/deploy) for the recommended setup.

## Token storage and XSS trade-off

| Token         | Storage                   | Rationale                                                                                                  |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Access token  | In-memory (Zustand store) | Never persisted; lost on page reload. A stolen in-memory token grants access only until the token expires. |
| Refresh token | `localStorage`            | Must survive page reloads to avoid forcing re-login. Accessible to any script running in the page origin.  |

**Risk:** A successful XSS attack can read `localStorage` and steal the refresh token, enabling persistent account access even after the attacker's script is removed. The primary mitigation is the strict CSP above, which blocks the script-injection vectors that would be needed to reach `localStorage`. HttpOnly cookies would eliminate this risk but require same-site or CORS-aware backend coordination and are not the current design.
