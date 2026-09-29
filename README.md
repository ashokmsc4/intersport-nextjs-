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
  app/actions/       # server actions: auth, cart, checkout
  components/        # shared UI (forms, cart, checkout)
  i18n/              # locale config and EN/AR dictionaries
  lib/magento/       # REST client: catalog, home, customer, cart, checkout
  lib/session.ts     # httpOnly cookies for customer token and guest cart
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

Endpoints in use:

| Page | Source |
|---|---|
| Home sections | `settings/config.json` → `HorizonLayout` (banners, category carousel, product rails); falls back to the English file |
| Category tree, menu | `/media/mobile-app/intersport/{store}/data/categories.json` |
| Category products | `V1/mstore/products` (configurable items list with price 0; `minimal_price` is used) |
| Product page | `V1/aaw/productdetail/{sku}` (looked up by SKU; sizes and colours come from `childrens`) |
| You might also like | `V1/mstore/recommend-products/sku/{sku}` |
| Sign in / sign up | `V1/integration/customer/token`, `V1/customers` (needs `dob`, `gender`, `mobilenumber`), `V1/customers/me` |
| Cart | `V1/guest-carts/…` or `V1/carts/mine/…` for items and coupons; `V1/cartlist/{id}` for the item list and totals |
| Checkout | `V1/aaw/arealist` (governorates and areas), `V1/finalize-checkout` (shipping + payment options), `V1/do-checkout` (places the order) |

### Session

Tokens live in httpOnly cookies (`src/lib/session.ts`): the customer token after sign-in, the masked guest
cart id before it, plus the first name and cart count for the header. On sign-in a guest cart is assigned to
the customer when their cart is empty, otherwise its items are added to the customer's cart.

### Staging notes

- `productdetail` can take ~20s on a cold call, so responses are cached.
- `mstore/products` may return fewer items than `pageSize` while `total_count` stays correct.
- There is no Arabic `settings/config.json`; the Arabic home page uses the English layout.
- Cart updates must include `extension_attributes.source_code` (`home_delivery`).

### Open backend questions

- `do-checkout` returns a gateway `payment_url` whose success/failure URLs point back to Magento, not to this
  storefront; the backend needs to support a web return URL.
- `V1/cartlist/{quoteId}` returns a customer's cart without authentication.

Scripts: `npm run lint`, `npm run typecheck`, `npm run build`.

## Roadmap

- [x] Project setup, locale routing, Magento REST client
- [x] Home page category grid, category page with products and pagination
- [ ] Category filters and sorting (`V1/m2-attributes`)
- [x] Product detail page (gallery, price, sizes, recommendations)
- [x] Home page from the app configuration
- [x] Sign in, sign up, sign out, account details
- [x] Add to cart for guests and customers (guest cart moves to the customer on sign-in)
- [x] Cart page (quantity, remove, coupon, totals)
- [x] Checkout (Kuwait address, delivery method, payment method, place order)
- [ ] Payment return pages and order history
- [ ] Search
- [ ] Saved addresses, wishlist, password reset
- [ ] CMS pages, SEO redirects from existing Magento URLs
