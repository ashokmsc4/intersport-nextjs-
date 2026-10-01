/**
 * SEO URLs, the same as the Magento website's (with the locale in front):
 * products /en/<url_key>.html, categories /en/<url/key/path>.html.
 * Without a key they fall back to /en/product/<sku> and /en/category/<id>,
 * which redirect to the SEO URL.
 */
export const productHref = (locale: string, product: { urlKey?: string | null; sku: string }) =>
  product.urlKey
    ? `/${locale}/${product.urlKey}.html`
    : `/${locale}/product/${encodeURIComponent(product.sku)}`;

export const categoryHref = (locale: string, category: { path?: string | null; id: number }) =>
  category.path ? `/${locale}/${category.path}.html` : `/${locale}/category/${category.id}`;
