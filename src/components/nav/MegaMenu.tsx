import Link from "next/link";
import { categoryHref } from "@/lib/urls";
import type { NavNode } from "@/lib/magento/catalog";
import { MegaMenuShell } from "./MegaMenuShell";

const href = (locale: string, node: NavNode) => categoryHref(locale, node);

/**
 * Desktop category menu. Each top-level item opens a full-width panel on hover
 * or keyboard focus (pure CSS). L2s with children become columns with their L3
 * links; flat lists (Brands, Sports) flow into columns.
 */
export function MegaMenu({
  locale,
  tree,
  labels,
}: {
  locale: string;
  tree: NavNode[];
  labels: { categories: string; viewAll: string };
}) {
  return (
    <MegaMenuShell label={labels.categories}>
      <ul className="mx-auto flex max-w-7xl gap-6 px-4 text-sm font-semibold uppercase tracking-wide">
        {tree.map((l1) => {
          const grouped = l1.children.some((l2) => l2.children.length > 0);
          return (
            <li key={l1.id} className="group">
              <Link
                href={href(locale, l1)}
                prefetch={false}
                className="block border-b-2 border-transparent py-3 group-hover:border-brand group-hover:text-brand group-focus-within:border-brand"
              >
                {l1.name}
              </Link>
              {l1.children.length > 0 && (
                <div className="mega-panel invisible absolute inset-x-0 top-full z-40 border-t border-neutral-200 bg-white normal-case tracking-normal opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="mx-auto max-h-[70vh] max-w-7xl overflow-y-auto px-4 py-6">
                    {grouped ? (
                      <ul className="grid grid-cols-4 gap-x-8 gap-y-6 xl:grid-cols-5">
                        {l1.children.map((l2) => (
                          <li key={l2.id}>
                            <Link
                              href={href(locale, l2)}
                              prefetch={false}
                              className="font-bold text-neutral-900 hover:text-brand"
                            >
                              {l2.name}
                            </Link>
                            {l2.children.length > 0 && (
                              <ul className="mt-2 flex flex-col gap-1.5 font-normal text-neutral-600">
                                {l2.children.map((l3) => (
                                  <li key={l3.id}>
                                    <Link href={href(locale, l3)} prefetch={false} className="hover:text-brand">
                                      {l3.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="columns-3 gap-8 font-normal text-neutral-700 xl:columns-5">
                        {l1.children.map((l2) => (
                          <li key={l2.id} className="break-inside-avoid py-1">
                            <Link href={href(locale, l2)} prefetch={false} className="hover:text-brand">
                              {l2.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={href(locale, l1)}
                      prefetch={false}
                      className="mt-6 inline-block font-semibold text-brand underline"
                    >
                      {labels.viewAll.replace("{name}", l1.name)}
                    </Link>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </MegaMenuShell>
  );
}
