"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  miniCartAction,
  removeItemAction,
  updateQtyAction,
  type MiniCart,
} from "@/app/actions/cart";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";

type Ctx = { openCart: (options?: { added?: boolean }) => void };
const CartDrawerContext = createContext<Ctx>({ openCart: () => {} });

export const useCartDrawer = () => useContext(CartDrawerContext);

/** Provides `openCart()` to the page and renders the side drawer. */
export function CartDrawerProvider({
  locale,
  dict,
  imageHosts,
  children,
}: {
  locale: Locale;
  dict: Pick<Dictionary, "miniCart" | "cart" | "delivery">;
  /** Hosts served through the image optimizer (see lib/media). */
  imageHosts: string[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [cart, setCart] = useState<MiniCart | null>(null);
  const [pending, startTransition] = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(
    () =>
      startTransition(async () => {
        setCart(await miniCartAction(locale));
      }),
    [locale],
  );

  const openCart = useCallback(
    (options?: { added?: boolean }) => {
      setAdded(Boolean(options?.added));
      setOpen(true);
      load();
    },
    [load],
  );

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const change = (action: typeof removeItemAction, fields: Record<string, string>) =>
    startTransition(async () => {
      const form = new FormData();
      form.set("locale", locale);
      for (const [k, v] of Object.entries(fields)) form.set(k, v);
      await action(undefined, form);
      setCart(await miniCartAction(locale));
    });

  const optimized = (src: string | null) => {
    try {
      return src ? imageHosts.includes(new URL(src).hostname) : false;
    } catch {
      return false;
    }
  };
  const t = dict.miniCart;

  return (
    <CartDrawerContext.Provider value={{ openCart }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.title}>
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-neutral-200 p-4">
              <h2 className="text-lg font-bold">
                {t.title}
                {cart && cart.count > 0 && ` (${cart.count})`}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1 text-2xl leading-none"
                aria-label={t.close}
              >
                ×
              </button>
            </header>

            {added && (
              <p role="status" className="bg-green-50 px-4 py-2 text-sm text-green-800">
                ✓ {t.added}
              </p>
            )}

            <div className="flex-1 overflow-y-auto" aria-busy={pending}>
              {!cart ? (
                <p className="p-4 text-sm text-neutral-500">{t.loading}</p>
              ) : cart.lines.length === 0 ? (
                <p className="p-4 text-neutral-600">{t.empty}</p>
              ) : (
                <ul className="divide-y divide-neutral-200">
                  {cart.lines.map((line) => (
                    <li key={line.itemId} className="flex gap-3 p-4">
                      <ProductImage
                        src={line.image}
                        alt=""
                        sizes="80px"
                        optimized={optimized(line.image)}
                        className="size-20 shrink-0 rounded"
                      />
                      <div className="flex flex-1 flex-col gap-1 text-sm">
                        {line.brand && (
                          <p className="text-xs uppercase tracking-wide text-neutral-500">{line.brand}</p>
                        )}
                        <p className="font-medium">{line.name}</p>
                        <p className="text-xs text-neutral-600">
                          {[
                            line.size && `${dict.cart.size}: ${line.size}`,
                            line.color && `${dict.cart.color}: ${line.color}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {line.pickupStore && (
                          <p className="text-xs text-brand">
                            {dict.delivery.pickupFrom.replace("{store}", line.pickupStore)}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-3">
                          <select
                            aria-label={dict.cart.update}
                            value={line.qty}
                            disabled={pending}
                            onChange={(e) =>
                              change(updateQtyAction, {
                                itemId: line.itemId,
                                sku: line.sku,
                                qty: e.target.value,
                                sourceCode: line.sourceCode,
                              })
                            }
                            className="rounded border border-neutral-300 px-2 py-1"
                          >
                            {Array.from(
                              { length: Math.max(line.qty, Math.min(10, line.maxQty || 10)) },
                              (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  {i + 1}
                                </option>
                              ),
                            )}
                          </select>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => change(removeItemAction, { itemId: line.itemId })}
                            className="text-xs text-neutral-500 underline hover:text-brand-accent"
                          >
                            {dict.cart.remove}
                          </button>
                        </div>
                      </div>
                      <div className="text-end text-sm">
                        <p className="font-semibold">{formatPrice(line.lineTotal, locale)}</p>
                        {line.lineTotal < line.lineBefore && (
                          <s className="text-xs text-neutral-500">
                            {formatPrice(line.lineBefore, locale)}
                          </s>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart && cart.lines.length > 0 && (
              <footer className="flex flex-col gap-3 border-t border-neutral-200 p-4">
                <p className="flex justify-between font-semibold">
                  <span>{t.subtotal}</span>
                  <span>{formatPrice(cart.subtotal, locale)}</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/${locale}/cart`}
                    onClick={() => setOpen(false)}
                    className="rounded border border-neutral-800 px-4 py-3 text-center font-semibold"
                  >
                    {t.viewCart}
                  </Link>
                  <Link
                    href={`/${locale}/checkout`}
                    onClick={() => setOpen(false)}
                    className="rounded bg-brand px-4 py-3 text-center font-semibold text-white"
                  >
                    {t.checkout}
                  </Link>
                </div>
              </footer>
            )}
          </aside>
        </div>
      )}
    </CartDrawerContext.Provider>
  );
}

/** Header cart link: opens the drawer, but still works as a plain link without JavaScript. */
export function CartButton({
  locale,
  label,
  count,
}: {
  locale: string;
  label: string;
  count: number;
}) {
  const { openCart } = useCartDrawer();
  return (
    <Link
      href={`/${locale}/cart`}
      onClick={(e) => {
        e.preventDefault();
        openCart();
      }}
      className="relative font-medium"
    >
      {label}
      {count > 0 && (
        <span className="ms-1 rounded-full bg-brand-accent px-2 py-0.5 text-xs text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
