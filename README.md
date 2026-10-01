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
| Category products | `V1/mstore/products` (configurable items list with price 0; `minimal_price` is used); filters and sorting via `filter_groups` / `sortOrders` |
| Category filters | `V1/m2-attributes?category_id=` (brands, sports, department, sizes, product type) |
| Search suggestions | `/api/suggest` → the website's autocomplete (`/searchautocomplete/ajax/suggest/`, Mirasvit; product ids from its price HTML) then those products by id from `V1/mstore/products` for the store view's names and prices; categories matched from the menu tree |
| Search | one word or SKU: `V1/mstore/products` name/SKU `like`; several words: `V1/search` (full-text, relevance order) then the products by id |
| Product page | `V1/aaw/productdetail/{sku}` (looked up by SKU; sizes and colours come from `childrens`) |
| You might also like | `V1/mstore/recommend-products/sku/{sku}` |
| Sign in / sign up | `V1/integration/customer/token`, `V1/customers` (needs `dob`, `gender`, `mobilenumber`), `V1/customers/me` |
| Cart | `V1/guest-carts/…` or `V1/carts/mine/…` for items and coupons; `V1/cartlist/{id}` for the item list and totals |
| Checkout | `V1/aaw/arealist` (governorates and areas), `V1/finalize-checkout` (shipping + payment options), `V1/do-checkout` (places the order) |
| Order history | `V1/mstore/me/orders` (scoped to the customer token; detail = same list filtered by `increment_id`) |
| Saved addresses | `V3/customer/address/{customerId}` (list), `V3/customer/address` (create), `V3/customer/address/{addressId}` (delete) |
| Click & Collect | `V1/storepickup_msi/{productId}/getAvailabilityByProduct` (stores with stock; per size for configurables); the store's location id is sent as the cart item's `source_code`, home delivery as `home_delivery`; checkout then offers `amstorepickup` |
| Size systems (US / UK / EU) | website widget `/sizemapregion/sizemapregion/render/?product_id=` (per-product conversion; EU selected by default) |
| Size guide | website widget `/sizechart/sizechart/render/?product_id=`, served by `/api/size-guide/{id}` as a standalone page in a sandboxed frame |
| Password reset | `V1/customers/password` (Magento emails a reset link; `MAGENTO_WEBSITE_ID`, default 3) |

### Running against production

```
MAGENTO_BASE_URL=https://www.intersport.com.kw
MAGENTO_USER_AGENT=...   # see below
```

- Production's firewall returns 403 for unknown User-Agents, including Node's default. The mobile app sends
  `Dart/2.10 (dart:io)`, which is allowed; for the live storefront the hosting team should allow a dedicated
  agent and `MAGENTO_USER_AGENT` should be set to it.
- Production's AWS WAF serves its bot check (a "Human Verification" HTML page) to requests from cloud hosts
  such as Vercel, which have no fixed IP addresses to allowlist. The hosting team adds a WAF rule that allows
  requests carrying a secret header; set `MAGENTO_ACCESS_HEADER_NAME` / `MAGENTO_ACCESS_HEADER_VALUE` to it.
  Every Magento request (REST, settings, media, widgets) sends it. `/api/health` reports `blockedBy` when
  the bot check is still served, and the server's outbound IP for the firewall logs.
- Settings files (`data/categories.json` etc.) have no version folder on production either.
- Magento's `/media` has hotlink protection: image requests referred by another domain get 403. Images are
  loaded directly from the CDN without a Referer (see Images below).
- Sign-up, cart and checkout on production create real accounts, carts and orders.

### Images

Browsers load Magento images directly from the CDNs; neither Vercel nor the Next.js optimizer fetches them:

- URLs on `prod.aaw.com` and `static.aawweb.com` are used as the API returns them.
- Catalog paths, `admin.*` / `MAGENTO_BACKEND_MEDIA_HOSTS` URLs and `/media` URLs on the storefront host are
  moved to `MAGENTO_MEDIA_URL` (default `https://static.aawweb.com` for production, the base URL otherwise).
- Magento's hotlink protection rejects image requests whose Referer is another site, so images are requested
  with `referrerPolicy="no-referrer"` (`ProductImage`, `Banner`, the size guide).
- `IMAGE_PROXY=true` switches back to serving images through `/api/media` (a pass-through limited to the media
  hosts), e.g. if the CDN ever blocks direct requests.

### Performance

- Pages don't read cookies, so they can be cached: the header gets the shopper's name and cart count in the
  browser from `/api/session` (`CartDrawerProvider`). Only cart, checkout and account pages are per-shopper.
- Home is prerendered and refreshed every 5 minutes. Product pages render per request and stream (the
  first byte leaves in ~0.1 s whatever Magento's speed) from cached Magento data
  (`MAGENTO_REVALIDATE_SECONDS`); Click & Collect stock is loaded live when the shopper picks it.
- Category and search pages depend on filters in the URL, so they render per request from cached Magento data.
- Category and search listings use infinite scroll: the server renders the first 24 products, later pages
  load through the `loadListingPage` server action as the shopper nears the end (`InfiniteProducts`). The
  list and scroll position are kept in sessionStorage for the back button; a `?page=` "Load more" link
  remains for crawlers.
- Magento calls are made in parallel wherever they don't depend on each other, and only the ones a page shows:
  - Guest carts: one round trip (`cartlist` takes the masked id and returns the quote id); the coupon is only
    loaded on the cart page.
  - Add to cart: a single "add item" call (a new guest cart only when Magento says the old one is gone); the
    drawer opens at once with the product and fills in when Magento confirms. Quantity changes update the
    header count without re-reading the cart.
  - Checkout: the form renders straight away; the order summary streams in with the cart.
  - Product pages: recommendations (up to ~12 s cold on production) stream in below the product.
  - Category pages: filters and products load in parallel; after a listing is sent, the first products'
    details and size widgets are fetched into the cache (`after()`, two at a time) so opening one is fast.
- `MAGENTO_TIMING=1` logs every Magento call with its duration.
- Instant taps: every link responds at once, even when Magento is slow.
  - `NavigationProgress` starts a bar at the top on the tap itself (links that only open UI carry
    `data-no-progress`).
  - Product, category and search routes have `loading.tsx` skeletons shaped like the page. Visible links
    prefetch only up to that skeleton (no Magento calls), so a tap shows it in well under 100 ms and the
    content streams in. Search results stream behind a Suspense boundary keyed by the query, so a new search
    from the search page shows the skeleton too.
  - Mega menu panels are hidden but laid out, so their links prefetch on hover/touch/focus
    (`HoverPrefetchLink`) instead of all ~235 at once. The search box is a `next/form`, so a search
    navigates in place.
- On Vercel, set the Functions region next to the Magento server: production is hosted in Ireland, so use
  Dublin (`dub1`). The default (Washington, `iad1`) adds a transatlantic round trip to every uncached Magento
  call. Cached pages are served from Vercel's edge nearest the shopper whatever the region.
- Measure with `npm run build && npm start`; `npm run dev` compiles each page on first visit and is always slower.

### Deploying to Cloudflare Workers

The app runs on Workers through [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`,
configured in `open-next.config.ts` and `wrangler.jsonc`). Tested on the Workers runtime (`wrangler dev`)
against staging: catalog, search, product pages, add to cart, Click & Collect, sign-in, cart and checkout.

- **Plan:** Workers Paid. The free plan allows 10 ms of CPU per request, which server-rendering exceeds;
  Paid allows 30 s (time spent waiting on Magento doesn't count). The bundle is ~2.5 MB compressed.
- **Caching:** cached pages and Magento responses are stored in R2 with a per-region in-memory
  layer; background refreshes go through a Durable Object queue.
- **Placement:** Smart Placement runs the Worker near Magento (Ireland), since pages make several
  Magento calls in a row.
- **Settings:** non-secret ones are `vars` in `wrangler.jsonc`; secrets (`MAGENTO_ACCESS_HEADER_VALUE`,
  `MAGENTO_INTEGRATION_TOKEN`) via `npx wrangler secret put <NAME>`. The build also reads
  `MAGENTO_BASE_URL` (the home page is prerendered), so set it in `.env.production` or the build
  environment too.
- **Firewall:** requests come from Cloudflare's network. If Magento's firewall blocks them (as it does
  Vercel's), use the access header (`MAGENTO_ACCESS_HEADER_NAME` / `_VALUE`) and check `/api/health`.
- `proxy.ts` (the `/` → `/en` redirect) runs as Node.js middleware, which OpenNext marks experimental on
  Cloudflare; it worked in testing.

First deploy:

```bash
npx wrangler login
npx wrangler r2 bucket create intersport-nextjs-cache
npx wrangler secret put MAGENTO_ACCESS_HEADER_VALUE   # when the hosting team provides it
npm run cf:deploy                                     # build + deploy
```

`npm run cf:preview` builds and runs the Worker locally (`wrangler dev`); put local secrets in `.dev.vars`
(see `.dev.vars.example`). Add a custom domain under the Worker's Settings → Domains & Routes.

### SEO URLs

URLs match the Magento website's, with the locale in front, so links and rankings carry over:

| Page | URL | Served by |
|---|---|---|
| Product | `/en/<url_key>.html` | `[lang]/product/[key]` |
| Category | `/en/<url/key/path>.html` (e.g. `/en/men/men-shoes/running-0.html`) | `[lang]/category/[id]` |

- `proxy.ts` rewrites SEO URLs to the internal routes. Category paths are the `url_key`s from
  `categories.json` (per locale: some Arabic keys differ), cached for 10 minutes.
- The REST API can't filter products by `url_key`; `skuForUrlKey` tries the key's last words as SKUs
  (Magento builds keys as `<name>-<sku>`), keeps the exact `url_key` match, and falls back to search.
- Redirects (301): Magento's own URLs without a locale (`/men.html`) → `/en/men.html`; old
  `/en/category/<id>` → the category's SEO URL. Old `/en/product/<SKU>` links redirect to the product's URL.
- Pages carry `rel=canonical` and `hreflang` (en/ar) links.

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
- `V3/customer/address/{customerId}` returns any customer's addresses to any signed-in customer. The storefront
  only requests the signed-in customer's own id and checks ownership before deleting, but the API must be fixed.
- `V1/mstore/products` doesn't do a plain "contains" match for text with spaces, and `V1/search` relevance on
  staging is weak (words are ORed); search quality depends on the backend's search configuration.
- The password reset email links to the Magento website to set the new password.
- Adding a product that's already in the cart with a different delivery option updates the existing line
  (Magento merges items with the same SKU), so one product can't be split between home delivery and pickup.

Scripts: `npm run lint`, `npm run typecheck`, `npm run build`.

## Roadmap

- [x] Project setup, locale routing, Magento REST client
- [x] Home page category grid, category page with products and infinite scroll
- [ ] Category filters and sorting (`V1/m2-attributes`)
- [x] Product detail page (gallery, price, sizes, recommendations)
- [x] Home page from the app configuration
- [x] Sign in, sign up, sign out, account details
- [x] Add to cart for guests and customers (guest cart moves to the customer on sign-in)
- [x] Cart page (quantity, remove, coupon, totals)
- [x] Checkout (Kuwait address, delivery method, payment method, place order)
- [x] Order history and order detail
- [x] Saved addresses (account page and checkout)
- [x] Password reset request
- [x] Search, category filters and sorting
- [x] Category navigation: desktop mega menu (L1 → L2 columns → L3), mobile menu, breadcrumbs and sibling categories
- [x] Cart side drawer (opens after add to cart and from the header)
- [x] Home delivery / Click & Collect on the product page, pickup store shown in cart and preselected at checkout
- [x] Footer (service highlights, customer service and about links, contact, social); content pages still link to Magento
- [ ] Content (CMS) pages rebuilt in Next.js
- [ ] Payment return pages (needs backend support)
- [ ] Wishlist, change password, order cancellation
- [ ] CMS pages, SEO redirects from existing Magento URLs
