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
import {
  BagIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
  StoreIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
} from "@/components/icons";

/** The product being added, shown in the drawer until Magento confirms it. */
export type PendingLine = {
  name: string;
  image: string | null;
  imageOptimized: boolean;
  size?: string;
  qty: number;
};

type Ctx = {
  openCart: (options?: { added?: boolean }) => void;
  /** Opens the drawer right away with the product being added. */
  startAdding: (line: PendingLine) => void;
  /** The add failed: close the drawer (the product page shows the error). */
  addFailed: () => void;
  /** Signed-in first name, or null (loaded in the browser via /api/session). */
  name: string | null;
  count: number;
  setCount: (count: number) => void;
};
const CartDrawerContext = createContext<Ctx>({
  openCart: () => {},
  startAdding: () => {},
  addFailed: () => {},
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
  const [adding, setAdding] = useState<PendingLine | null>(null);
  // Magento confirmed the add; the line stays until the full cart has loaded.
  const [confirmed, setConfirmed] = useState(false);
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
        setAdding(null);
      }),
    [locale, setCount],
  );

  const openCart = useCallback(
    (options?: { added?: boolean }) => {
      setAdded(Boolean(options?.added));
      setConfirmed(Boolean(options?.added));
      setOpen(true);
      load();
    },
    [load],
  );

  const startAdding = useCallback((line: PendingLine) => {
    setAdding(line);
    setAdded(false);
    setConfirmed(false);
    setOpen(true);
  }, []);

  const addFailed = useCallback(() => {
    setAdding(null);
    setOpen(false);
  }, []);

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
      // Only the cart and checkout pages show server-rendered cart data.
      form.set("refresh", /\/(cart|checkout)(\/|$)/.test(pathname) ? "1" : "0");
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
    <CartDrawerContext.Provider value={{ openCart, startAdding, addFailed, name: session.name, count: session.count, setCount }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.title}>
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-neutral-100 shadow-xl">
            <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-4">
              <h2 className="text-base font-bold uppercase tracking-wide">
                {t.title}
                {cart && cart.count > 0 && (
                  <span className="ms-2 font-normal text-neutral-500">({cart.count})</span>
                )}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:text-brand"
                aria-label={t.close}
              >
                <CloseIcon />
              </button>
            </header>

            {adding && !confirmed ? (
              <p role="status" className="bg-white px-4 py-2 text-sm text-neutral-700">
                {t.adding}
              </p>
            ) : (
              added && (
                <p role="status" className="bg-green-50 px-4 py-2 text-sm text-green-800">
                  ✓ {t.added}
                </p>
              )
            )}

            <div className="flex-1 overflow-y-auto p-3" aria-busy={pending}>
              {/* The product being added, until the confirmed cart replaces it. */}
              {adding && (
                <div
                  className={`mb-3 flex gap-4 rounded-lg bg-white p-4 ${confirmed ? "" : "animate-pulse opacity-70"}`}
                  aria-hidden
                >
                  <ProductImage
                    src={adding.image}
                    alt=""
                    sizes="80px"
                    optimized={adding.imageOptimized}
                    className="size-20 shrink-0 rounded"
                  />
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="font-semibold uppercase">{adding.name}</p>
                    <p className="text-xs text-neutral-600">
                      {[adding.size && `${dict.cart.size}: ${adding.size}`, `× ${adding.qty}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              )}
              {!cart ? (
                !adding && <p className="p-1 text-sm text-neutral-500">{t.loading}</p>
              ) : cart.lines.length === 0 ? (
                !adding && (
                  <div className="rounded-lg bg-white p-6 text-center text-sm text-neutral-600">{t.empty}</div>
                )
              ) : (
                <ul className="flex flex-col gap-3">
                  {cart.lines.map((line) => {
                    const limit = Math.max(line.qty, Math.min(10, line.maxQty || 10));
                    const setQty = (qty: number) =>
                      change(updateQtyAction, {
                        itemId: line.itemId,
                        sku: line.sku,
                        qty: String(qty),
                        sourceCode: line.sourceCode,
                        countDelta: String(qty - line.qty),
                      });
                    return (
                      <li key={line.itemId} className="flex gap-4 rounded-lg bg-white p-4">
                        <ProductImage
                          src={line.image}
                          alt=""
                          sizes="80px"
                          optimized={optimized(line.image)}
                          className="size-20 shrink-0 rounded"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                          <div className="flex items-start gap-2">
                            <p className="flex-1 font-semibold uppercase">{line.name}</p>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => change(removeItemAction, { itemId: line.itemId, countDelta: String(-line.qty) })}
                              aria-label={t.removeItem.replace("{name}", line.name)}
                              title={dict.cart.remove}
                              className="-m-1 shrink-0 rounded p-1 text-neutral-400 hover:text-brand-accent disabled:opacity-50"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                          {(line.size || line.color) && (
                            <p className="text-xs text-neutral-600">
                              {line.size && (
                                <>
                                  {dict.cart.size}: <b dir="auto" className="text-neutral-900">{line.size}</b>
                                </>
                              )}
                              {line.size && line.color && " · "}
                              {line.color && (
                                <>
                                  {dict.cart.color}: <b dir="auto" className="text-neutral-900">{line.color}</b>
                                </>
                              )}
                            </p>
                          )}
                          <p className="flex items-center gap-1.5 text-xs text-neutral-600 [&_svg]:size-4 [&_svg]:shrink-0">
                            {line.pickupStore ? (
                              <>
                                <StoreIcon />
                                {dict.delivery.pickup} · {line.pickupStore}
                              </>
                            ) : (
                              <>
                                <TruckIcon />
                                {dict.delivery.home}
                              </>
                            )}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p>
                              <span className="font-bold">{formatPrice(line.lineTotal, locale)}</span>
                              {line.lineTotal < line.lineBefore && (
                                <s className="ms-2 text-xs text-neutral-500">
                                  {formatPrice(line.lineBefore, locale)}
                                </s>
                              )}
                            </p>
                            <div className="flex items-center rounded border border-neutral-300">
                              <button
                                type="button"
                                disabled={pending || line.qty <= 1}
                                onClick={() => setQty(line.qty - 1)}
                                aria-label={t.decrease.replace("{name}", line.name)}
                                className="p-2 hover:text-brand disabled:text-neutral-300"
                              >
                                <MinusIcon />
                              </button>
                              <span aria-live="polite" className="min-w-8 text-center font-semibold">
                                {line.qty}
                              </span>
                              <button
                                type="button"
                                disabled={pending || line.qty >= limit}
                                onClick={() => setQty(line.qty + 1)}
                                aria-label={t.increase.replace("{name}", line.name)}
                                className="p-2 hover:text-brand disabled:text-neutral-300"
                              >
                                <PlusIcon />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {cart && cart.lines.length > 0 && (
              <footer className="flex flex-col gap-3 border-t border-neutral-200 bg-white p-4">
                <p className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">{t.subtotal}</span>
                  <span className="text-lg font-bold">{formatPrice(cart.subtotal, locale)}</span>
                </p>
                <Link
                  href={`/${locale}/checkout`}
                  onClick={() => setOpen(false)}
                  className="rounded bg-brand px-4 py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white hover:bg-brand/90"
                >
                  {t.checkout}
                </Link>
                <Link
                  href={`/${locale}/cart`}
                  onClick={() => setOpen(false)}
                  className="rounded border border-brand px-4 py-3.5 text-center text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand/5"
                >
                  {t.viewCart}
                </Link>
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
