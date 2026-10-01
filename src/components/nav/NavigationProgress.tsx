"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type State = "idle" | "loading" | "done";

/** Where a click or GET form submission would take the shopper, if it is an in-site page change. */
function destination(e: Event): URL | null {
  if (e instanceof MouseEvent) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
    const a = (e.target as Element | null)?.closest?.("a");
    if (!a || !a.href || a.hasAttribute("download") || a.closest("[data-no-progress]")) return null;
    if (a.target && a.target !== "_self") return null;
    return new URL(a.href, location.href);
  }
  // Only forms that navigate (method="get" or a URL action): not server-action or JS-handled forms.
  const form = e.target as HTMLFormElement;
  if (!(form instanceof HTMLFormElement)) return null;
  if (form.getAttribute("method")?.toLowerCase() !== "get" && !form.hasAttribute("action")) return null;
  if (form.method.toLowerCase() !== "get") return null;
  if (form.closest("[data-no-progress]")) return null;
  return new URL(form.action, location.href);
}

/**
 * Thin bar at the top of the page that starts the moment a link is tapped and
 * completes when the new page arrives, so every tap gets instant feedback even
 * before the destination's loading skeleton can show.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState<State>("idle");
  const safety = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Capture phase: runs before the link's own handler, on the same tap.
    const start = (e: Event) => {
      const url = destination(e);
      if (!url || url.origin !== location.origin) return;
      // Same page (or only the #hash changes): nothing to wait for.
      if (url.pathname === location.pathname && (e.type === "click" ? url.search === location.search : false)) return;
      setState("loading");
      clearTimeout(safety.current);
      // If the navigation never happens (cancelled, error), don't leave the bar hanging.
      safety.current = setTimeout(() => setState("idle"), 30000);
    };
    document.addEventListener("click", start, true);
    document.addEventListener("submit", start, true);
    return () => {
      document.removeEventListener("click", start, true);
      document.removeEventListener("submit", start, true);
      clearTimeout(safety.current);
    };
  }, []);

  // The new page is in: finish the bar, then hide it.
  useEffect(() => {
    clearTimeout(safety.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the router's URL change
    setState((s) => (s === "loading" ? "done" : s));
    const t = setTimeout(() => setState((s) => (s === "done" ? "idle" : s)), 300);
    return () => clearTimeout(t);
  }, [pathname, search]);

  if (state === "idle") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div
        className={`h-full origin-left bg-brand rtl:origin-right ${
          state === "loading" ? "animate-[nav-progress_8s_cubic-bezier(0.1,0.7,0.2,1)_forwards]" : "scale-x-100 opacity-0 transition-[opacity] delay-150 duration-150"
        }`}
      />
    </div>
  );
}
