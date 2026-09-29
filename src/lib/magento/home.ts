import "server-only";
import type { Locale } from "@/i18n/config";
import { MagentoError, magentoAppSettings } from "./client";

/** Links in the app config point at a category id or an absolute URL. */
export type HomeLink = { category?: number; url?: string };

export type HomeSection =
  | {
      layout: "bannerImage";
      items: ({ image: string; desktop_image?: string } & HomeLink)[];
    }
  | {
      layout: "category";
      title?: string;
      items: ({ image: string; desktop_image?: string } & HomeLink)[];
    }
  | { layout: "threeColumn"; name: string; category: number }
  | {
      layout: "bannerTimer";
      title: string;
      name: string;
      category: number;
      startTime: string;
      endTime: string;
    }
  | { layout: "logo" };

type AppConfig = { HorizonLayout?: HomeSection[] };

/**
 * The mobile app's home screen definition (`settings/config.json`). Falls back
 * to the English file when a store view has none (staging has no Arabic one).
 */
export async function getHomeSections(locale: Locale) {
  const config = await magentoAppSettings<AppConfig>("settings/config.json", {
    locale,
  }).catch((error) => {
    if (locale !== "en" && error instanceof MagentoError && error.status === 404) {
      return magentoAppSettings<AppConfig>("settings/config.json", {
        locale: "en",
      });
    }
    throw error;
  });
  const now = Date.now();
  return (config.HorizonLayout ?? []).filter(
    (section) =>
      section.layout !== "bannerTimer" ||
      Date.parse(section.endTime.replace(" ", "T")) > now,
  );
}
