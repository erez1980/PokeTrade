# Deployment

The site is a fully static export (`out/`). No server, database or secrets are needed.

## GitHub Pages (default)

`.github/workflows/deploy-pages.yml` builds with `NEXT_PUBLIC_BASE_PATH=/<repo-name>` on every push to `main` and deploys to Pages.
One-time setup: repository **Settings → Pages → Source: GitHub Actions**.

## Any static host (Netlify, Cloudflare Pages, Vercel static, S3+CloudFront, nginx)

```bash
npm ci
npm run build                  # → out/
# optional sub-path:  NEXT_PUBLIC_BASE_PATH=/poketrade npm run build
```

Serve `out/` with HTTPS. Recommended response headers (meta CSP is already embedded; headers add what meta can't):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://raw.githubusercontent.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), geolocation=(), microphone=(self)
X-Frame-Options: DENY
```

Cache: `/_next/static/*` immutable for 1 year; `/data/*.json` short (e.g. 10 min) so catalog updates propagate.

## Updating data in production

Merge the automated "Catalog update" PR (or run `npm run data:update` locally, review `public/data/report.json`, commit). Rollback: `npm run data:rollback -- <version>`, commit, push.
