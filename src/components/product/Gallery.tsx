"use client";

import { useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";

type GalleryImage = { src: string; optimized: boolean };

/**
 * Product photos. Phones: a full-width swipe carousel with dots, so the product name and
 * sizes stay near the top. Larger screens: the main photo with clickable thumbnails.
 */
export function Gallery({
  images,
  name,
  imageOf,
}: {
  images: GalleryImage[];
  name: string;
  /** "Image {n} of {total}" */
  imageOf: string;
}) {
  const [current, setCurrent] = useState(0);
  const track = useRef<HTMLUListElement>(null);
  const label = (i: number) => imageOf.replace("{n}", String(i + 1)).replace("{total}", String(images.length));

  if (images.length === 0) return <ProductImage src={null} alt="" sizes="1px" className="aspect-square rounded-lg" />;

  // scrollLeft is negative in right-to-left pages.
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setCurrent(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };
  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const sign = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollTo({ left: sign * i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      {/* Phones */}
      <div className="relative -mx-4 md:hidden">
        <ul
          ref={track}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <li key={img.src} className="w-full shrink-0 snap-center" aria-label={label(i)}>
              <ProductImage
                src={img.src}
                alt={i === 0 ? name : ""}
                priority={i === 0}
                optimized={img.optimized}
                sizes="100vw"
                className="aspect-square"
              />
            </li>
          ))}
        </ul>
        {images.length > 1 && (
          <>
            <span className="absolute end-3 top-3 rounded-full bg-white/85 px-2 py-0.5 text-xs font-semibold tabular-nums" dir="ltr">
              {current + 1} / {images.length}
            </span>
            <div className="mt-3 flex justify-center gap-1.5">
              {images.slice(0, 12).map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={label(i)}
                  aria-current={i === current || undefined}
                  className="p-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-neutral-900" : "w-1.5 bg-neutral-300"}`}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tablets and desktops */}
      <div className="hidden flex-col gap-2 md:flex">
        <ProductImage
          src={images[current]?.src ?? images[0].src}
          alt={name}
          priority={current === 0}
          optimized={(images[current] ?? images[0]).optimized}
          sizes="50vw"
          className="aspect-square rounded-lg"
        />
        {images.length > 1 && (
          <ul className="grid grid-cols-5 gap-2">
            {images.map((img, i) => (
              <li key={img.src}>
                <button
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={label(i)}
                  aria-current={i === current || undefined}
                  className="block w-full overflow-hidden rounded-lg border-2 border-transparent aria-[current]:border-neutral-900"
                >
                  <ProductImage src={img.src} alt="" optimized={img.optimized} sizes="10vw" className="aspect-square" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
