"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { BagIcon, UserIcon } from "@/components/icons";

type Ctx = {
  openCart: (options?: { added?: boolean }) => void;
  /** Signed-in first name, or null (loaded in the browser via /api/session). */
  name: string | null;
  count: number;
  setCount: (count: number) => void;
};
const CartDrawerContext = createContext<Ctx>({
  openCart: () => {},
  name: null,
  count: 0,
  setCount: () => {},
});

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
  const [session, setSession] = useState<{ name: string | null; count: number }>({
    name: null,
    count: 0,
  });
  const setCount = useCallback((count: number) => setSession((s) => ({ ...s, count })), []);
  const pathname = usePathname();

  // Pages are cached without cookies; the header's name and count come from here.
  // Re-read on navigation so sign-in, sign-out and checkout are reflected.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSession({ name: data.name ?? null, count: Number(data.count) || 0 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const load = useCallback(
    () =>
      startTransition(async () => {
        const next = await miniCartAction(locale);
        setCart(next);
        setCount(next.count);
      }),
    [locale, setCount],
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
      const next = await miniCartAction(locale);
      setCart(next);
      setCount(next.count);
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
    <CartDrawerContext.Provider value={{ openCart, name: session.name, count: session.count, setCount }}>
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

/** Header bag icon with item count: opens the drawer (plain link without JavaScript). */
export function CartButton({ locale, label }: { locale: string; label: string }) {
  const { openCart, count } = useCartDrawer();
  return (
    <Link
      href={`/${locale}/cart`}
      onClick={(e) => {
        e.preventDefault();
        openCart();
      }}
      aria-label={count > 0 ? `${label} (${count})` : label}
      title={label}
      className="relative p-1 hover:text-brand"
    >
      <BagIcon />
      {count > 0 && (
        <span className="absolute -end-1 -top-1 min-w-5 rounded-full bg-brand-accent px-1 text-center text-[11px] leading-5 font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

/** Header account icon: sign-in page, or the account page once signed in. */
export function AccountButton({
  locale,
  labels,
}: {
  locale: string;
  labels: { login: string; account: string; hello: string };
}) {
  const { name } = useCartDrawer();
  const label = name ? labels.hello.replace("{name}", name) : labels.login;
  return (
    <Link
      href={name ? `/${locale}/account` : `/${locale}/account/login`}
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 p-1 hover:text-brand"
    >
      <UserIcon />
      {name && <span className="hidden max-w-24 truncate text-sm xl:inline">{name}</span>}
    </Link>
  );
}
