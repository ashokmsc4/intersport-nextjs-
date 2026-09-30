"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Link that prefetches when the shopper shows intent (hover, touch, focus) instead
 * of when it scrolls into view, so a grid of 24 products doesn't render 24 pages.
 */
export function HoverPrefetchLink(props: Omit<React.ComponentProps<typeof Link>, "href" | "prefetch"> & { href: string }) {
  const router = useRouter();
  const prefetch = () => router.prefetch(props.href);
  return (
    <Link
      {...props}
      prefetch={false}
      onMouseEnter={(e) => {
        prefetch();
        props.onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        prefetch();
        props.onTouchStart?.(e);
      }}
      onFocus={(e) => {
        prefetch();
        props.onFocus?.(e);
      }}
    />
  );
}
