"use client";

import Link from "next/link";
import { categoryHref } from "@/lib/urls";
import { useEffect, useState } from "react";
import type { NavNode } from "@/lib/magento/catalog";

/** Phone/tablet menu: slide-in panel with expandable L1 → L2 → L3 levels. */
export function MobileMenu({
  locale,
  tree,
  labels,
}: {
  locale: string;
  tree: NavNode[];
  labels: { menu: string; closeMenu: string; viewAll: string };
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Any link click inside the panel closes it.
  const closeOnLink = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-medium lg:hidden"
      >
        <span aria-hidden className="text-xl leading-none">☰</span>
        <span className="sr-only sm:not-sr-only">{labels.menu}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={labels.menu}>
          <button
            type="button"
            aria-label={labels.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            onClick={closeOnLink}
            className="absolute inset-y-0 start-0 flex w-full max-w-sm flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 p-4">
              <span className="text-lg font-bold">{labels.menu}</span>
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                aria-label={labels.closeMenu}
                className="px-2 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4">
              <Level nodes={tree} depth={1} locale={locale} viewAll={labels.viewAll} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

type LevelProps = { nodes: NavNode[]; depth: number; locale: string; viewAll: string };

/** One menu level; items with children expand in place. */
function Level({ nodes, depth, locale, viewAll }: LevelProps) {
  const href = (node: NavNode) => categoryHref(locale, node);
  return (
    <ul className={depth === 1 ? "divide-y divide-neutral-200" : "ps-4"}>
      {nodes.map((node) =>
        node.children.length > 0 ? (
          <li key={node.id}>
            <details className="group/level">
              <summary
                className={`flex cursor-pointer list-none items-center justify-between py-3 ${depth === 1 ? "font-semibold uppercase" : "font-medium"}`}
              >
                {node.name}
                <span aria-hidden className="transition-transform group-open/level:rotate-45">
                  +
                </span>
              </summary>
              <div className="pb-2">
                <Link href={href(node)} className="block py-2 ps-4 text-sm text-brand underline">
                  {viewAll.replace("{name}", node.name)}
                </Link>
                <Level nodes={node.children} depth={depth + 1} locale={locale} viewAll={viewAll} />
              </div>
            </details>
          </li>
        ) : (
          <li key={node.id}>
            <Link
              href={href(node)}
              className={`block py-3 ${depth === 1 ? "font-semibold uppercase" : "py-2 text-sm text-neutral-700"}`}
            >
              {node.name}
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}
