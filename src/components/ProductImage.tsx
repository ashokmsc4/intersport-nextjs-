import Image from "next/image";
import { isOptimizable } from "@/lib/media";

/**
 * Square product image filling its container. Known Magento hosts go through
 * the image optimizer (server-side fetch, resized, modern formats); anything
 * else falls back to a plain unoptimized image.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  optimized,
  className = "",
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Override host detection (client components don't see server env). */
  optimized?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      {src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={priority}
          unoptimized={!(optimized ?? isOptimizable(src))}
          // Magento's hotlink protection rejects image requests referred by other sites.
          referrerPolicy="no-referrer"
          className="object-contain"
        />
      )}
    </div>
  );
}
