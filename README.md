# Intersport Kuwait – Next.js storefront

Headless storefront for [intersport.com.kw](https://intersport.com.kw), built with Next.js (App Router) on top of the existing Magento 2 backend.

## Stack

- Next.js 16 (App Router, React Server Components), TypeScript
- Tailwind CSS 4
- Magento 2 REST API, including the custom AAW / mstore endpoints used by the mobile app (`src/lib/magento`)
- English / Arabic routes (`/en`, `/ar`) with RTL support (`src/i18n`)

## Getting started

```bash
cp .env.example .env.local   # defaults point at staging
npm install
npm run dev                  # http://localhost:3000
```

## Project layout

```
src/
  app/[lang]/        # every route lives under the locale segment
  components/        # shared UI
  i18n/              # locale config and EN/AR dictionaries
  lib/magento/       # REST client, catalog functions and types
  proxy.ts           # redirects "/" and un-prefixed paths to /en or /ar
```

## Magento API

All Magento calls run on the server. The storefront endpoints don't need an integration token;
`MAGENTO_INTEGRATION_TOKEN` is optional and never reaches the browser if set.

- `magentoRest(path, { locale, auth })` calls `${MAGENTO_BASE_URL}/rest/${storeCode}/${path}`.
  `auth` is `integration` (default; adds `MAGENTO_INTEGRATION_TOKEN` only when it is set), `customer` (customer token) or `none`.
  GET requests that don't use a customer token are cached for `MAGENTO_REVALIDATE_SECONDS`.
- `magentoAppSettings(file, { locale })` reads the public mobile-app settings files under
  `/media/mobile-app/intersport/{store}/` (for example `data/categories.json`).

| Store view | Locale |
|---|---|
| `intersport_en` | `/en` |
| `intersport_ar` | `/ar` (RTL) |

Scripts: `npm run lint`, `npm run typecheck`, `npm run build`.

## Roadmap

- [x] Project setup, locale routing, Magento REST client
- [x] Home page category grid, category page with products and pagination
- [ ] Category filters and sorting (`V1/m2-attributes`)
- [x] Product detail page (gallery, price, sizes, recommendations)
- [ ] Add to cart and size selection
- [ ] Search
- [ ] Cart and checkout (shipping, payment gateways)
- [ ] Customer account (login, orders, addresses, wishlist)
- [ ] CMS pages, SEO redirects from existing Magento URLs
