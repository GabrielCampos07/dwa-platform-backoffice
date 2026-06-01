# Platform Backoffice

Angular app for **generic platform operations** (labels, feature flags, brand config) — separate from tenant product admin UIs.

**Repository path:** `c:\Users\gcampos\Documents\dwa-platform-backoffice` (sibling to product repos such as `dwa-academia`).

## Prerequisites

- Node.js **22+**
- Platform API running locally on port **3000** (e.g. `dwa-academia` with `npm run dev:api`)

## Quick start

```bash
cd dwa-platform-backoffice
npm install
npm start
```

Open **http://localhost:4300**. On login, paste the same `INTERNAL_API_KEY` as in the API `.env`.

### Run alongside a product API

| Terminal | Command | URL |
|----------|---------|-----|
| Product API | `cd dwa-academia && npm run dev:api` | API `:3000` |
| Backoffice | `cd dwa-platform-backoffice && npm start` | `:4300` |

The dev server proxies `/internal`, `/api`, and `/health` to `http://localhost:3000` (`proxy.conf.json`).

## Context bar (tenant / product)

After login, use the **context bar** at the top of the shell:

1. Enter **Tenant ID** and **Product ID** (e.g. `dwa` / `academia`).
2. Click **Aplicar escopo** — values persist in `sessionStorage` for the tab.
3. Feature flags and the labels list filter by this scope.

Optional build-time defaults via `.env.example` (`NG_APP_TENANT_ID`, `NG_APP_PRODUCT_ID`).

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Store `INTERNAL_API_KEY` in `sessionStorage` |
| `/` | Dashboard — `/health` + internal API auth check for selected scope |
| `/labels` | List labels (filtered by context when set) |
| `/labels/new` | Create label (slug, name, brandConfig JSON) |
| `/labels/:id` | Edit label, toggle active, export bundle |
| `/feature-flags` | Toggles for selected tenant/product |
| `/campus-notices` | Documented API gap (gym admin JWT only) |
| `/brand-config` | Redirects workflow to Labels + brandConfig editor |

## Labels flow

1. **Login** with internal API key.
2. **Set scope** in the context bar (tenant + product).
3. **Labels** → **Nova label** — fill slug (kebab-case), name, optional `brandConfig` JSON.
4. **Edit** a row to update name, active flag, or brandConfig.
5. **Exportar bundle** on the detail page calls `GET /internal/v1/labels/:id/export` (label + feature flags for CI).

### Internal API — labels

```http
GET    /internal/v1/labels?tenantId=&productId=
POST   /internal/v1/labels
GET    /internal/v1/labels/:id
PATCH  /internal/v1/labels/:id
GET    /internal/v1/labels/:id/export
Authorization: Bearer <INTERNAL_API_KEY>
```

POST body example:

```json
{
  "tenantId": "dwa",
  "productId": "academia",
  "slug": "minha-academia",
  "name": "Minha Academia",
  "brandConfig": { "theme": { "primary": "#c9a227" } }
}
```

PATCH body (at least one field):

```json
{ "name": "Updated name", "isActive": true, "brandConfig": {} }
```

## Internal API — feature flags

```http
GET  /internal/v1/tenants/:tenantId/products/:productId/feature-flags
PUT  /internal/v1/tenants/:tenantId/products/:productId/feature-flags
Authorization: Bearer <INTERNAL_API_KEY>
```

## API configuration (example: dwa-academia)

In `apps/api/.env`:

| Variable | Purpose |
|----------|---------|
| `INTERNAL_API_KEY` | Min 16 chars — backoffice login key |
| `CORS_ORIGINS` | Must include `http://localhost:4300` |

```env
INTERNAL_API_KEY=dev-internal-api-key-change-me-min-16-chars
CORS_ORIGINS=http://localhost:4200,http://localhost:4300
```

## Build & typecheck

```bash
npm run build
npm run typecheck
```

## Security

- Never commit `.env` or real API keys.
- Restrict `/internal/v1` at the network edge in production (VPN / private network).
- Rotate `INTERNAL_API_KEY` with backoffice redeploy.
