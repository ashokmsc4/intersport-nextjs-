"use client";

import { useState } from "react";

/**
 * Wraps the CSS-only mega menu so a clicked link closes its panel: after a
 * client-side navigation the link would otherwise keep focus (and hover),
 * leaving the panel open over the new page. Panels reopen once the pointer
 * leaves the menu.
 */
export function MegaMenuShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [closed, setClosed] = useState(false);
  return (
    <nav
      aria-label={label}
      data-closed={closed || undefined}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) {
          setClosed(true);
          (document.activeElement as HTMLElement | null)?.blur();
        }
      }}
      onMouseLeave={() => setClosed(false)}
      onFocus={() => setClosed(false)}
      className="hidden border-t border-neutral-100 lg:block"
    >
      {children}
    </nav>
  );
}
