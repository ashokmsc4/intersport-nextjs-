"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Link that prefetches when the shopper shows intent (hover, touch, focus) instead
 * of when it is on screen. For links that sit in hidden-but-laid-out panels (the
 * mega menu), where viewport prefetching would fetch hundreds of pages at once.
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
