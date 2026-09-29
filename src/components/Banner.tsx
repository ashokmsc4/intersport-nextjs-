import { getImageProps } from "next/image";
import { productImageUrl } from "@/lib/magento/client";
import { isOptimizable } from "@/lib/media";

/**
 * Home banner with separate phone and desktop artwork. Images are rewritten off
 * backend hosts and served through the optimizer (hotlink protection blocks
 * them when a browser requests them from another domain).
 */
export function Banner({
  image,
  desktopImage,
  alt = "",
  preload = false,
}: {
  image: string;
  desktopImage?: string;
  alt?: string;
  preload?: boolean;
}) {
  const mobileSrc = productImageUrl(image) ?? image;
  const desktopSrc = desktopImage ? (productImageUrl(desktopImage) ?? desktopImage) : null;
  const common = { alt, sizes: "(min-width: 768px) 50vw, 100vw", preload };

  // Intrinsic sizes are only placeholders; height:auto keeps each image's real ratio.
  const { props: { srcSet: desktop } } = getImageProps({
    ...common,
    src: desktopSrc ?? mobileSrc,
    width: 1600,
    height: 500,
    unoptimized: !isOptimizable(desktopSrc ?? mobileSrc),
  });
  const { props: { srcSet: mobile, ...rest } } = getImageProps({
    ...common,
    src: mobileSrc,
    width: 1080,
    height: 675,
    unoptimized: !isOptimizable(mobileSrc),
  });

  return (
    <picture>
      {desktopSrc && <source media="(min-width: 768px)" srcSet={desktop} />}
      <source srcSet={mobile} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is in rest */}
      <img {...rest} style={{ width: "100%", height: "auto" }} />
    </picture>
  );
}
