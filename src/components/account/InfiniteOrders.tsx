"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadOrdersPage } from "@/app/actions/account";
import type { OrderRow } from "@/lib/orders";
import type { Dictionary } from "@/i18n/dictionaries";

/** Order history that loads older orders as the customer scrolls. */
export function InfiniteOrders({
  locale,
  initial,
  total,
  pageSize,
  dict,
}: {
  locale: string;
  initial: OrderRow[];
  total: number;
  pageSize: number;
  dict: Pick<Dictionary, "orders" | "category">;
}) {
  const [rows, setRows] = useState(initial);
  const [known, setKnown] = useState(total);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const state = useRef({ page: 1, total, rows: initial, loading: false });
  const sentinel = useRef<HTMLDivElement>(null);
  const done = rows.length >= known;
  const t = dict.orders;

  const loadMore = useCallback(async () => {
    const s = state.current;
    if (s.loading || s.page >= Math.ceil(s.total / pageSize)) return;
    s.loading = true;
    setStatus("loading");
    const result = await loadOrdersPage(locale, s.page + 1, pageSize);
    s.loading = false;
    if (!result.ok) return setStatus("error");
    const seen = new Set(s.rows.map((r) => r.id));
    s.rows = [...s.rows, ...result.rows.filter((r) => !seen.has(r.id))];
    s.page += 1;
    s.total = result.rows.length ? result.total : s.rows.length;
    setRows(s.rows);
    setKnown(s.total);
    setStatus("idle");
  }, [locale, pageSize]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || status !== "idle") return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), {
      rootMargin: "0px 0px 600px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [done, loadMore, status]);

  return (
    <>
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {rows.map((order) => (
          <li key={order.id}>
            <Link
              href={`/${locale}/account/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm hover:bg-neutral-50"
            >
              <span className="font-semibold">
                {t.order} #{order.id}
              </span>
              <span className="text-neutral-500">{order.date}</span>
              <span>{order.status}</span>
              <span className="font-semibold">{order.total}</span>
            </Link>
          </li>
        ))}
        {status === "loading" && (
          <li aria-hidden className="p-4">
            <div className="h-4 animate-pulse rounded bg-neutral-100" />
          </li>
        )}
      </ul>
      <div ref={sentinel} className="mt-6 flex justify-center text-sm" aria-live="polite">
        {status === "loading" && <p className="text-neutral-500">{dict.category.loadingMore}</p>}
        {status === "error" && (
          <button type="button" onClick={loadMore} className="rounded border border-neutral-300 px-5 py-2 font-semibold">
            {dict.category.retry}
          </button>
        )}
      </div>
    </>
  );
}
