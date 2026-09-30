/** Kuwait governorate → delivery areas, as returned by V1/aaw/arealist. */
export type Governorate = {
  governorate: string;
  areas: { area: string; area_name: string }[];
};

type Match = { governorate: string; areaId: string; areaName: string };

/** Blocks named in an area label, e.g. "(Block 1 to 9)" or "(Block 10, 11, 12)". */
function blocksOf(label: string): Set<number> | null {
  const m = label.match(/\(\s*block\s+([^)]*)\)/i);
  if (!m) return null;
  const blocks = new Set<number>();
  for (const part of m[1].split(",")) {
    const range = part.match(/(\d+)\s*(?:to|-)\s*(\d+)/i);
    if (range) {
      for (let b = Number(range[1]); b <= Number(range[2]); b++) blocks.add(b);
    } else if (/\d+/.test(part)) {
      blocks.add(Number(part.match(/\d+/)![0]));
    }
  }
  return blocks;
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Finds the delivery area for a saved address. Addresses saved on the Magento
 * site can hold a plain name ("Salmiya") while the list has block-specific
 * areas ("Salmiya (Block 10, 11, 12)"), so this tries, in order: area id,
 * exact name, then names starting with the saved one, picked by block number.
 */
export function resolveArea(
  governorates: Governorate[],
  saved: { areaId?: string; areaName?: string; governorate?: string; block?: string },
): Match | null {
  const all = governorates.flatMap((g) =>
    g.areas.map((a) => ({ governorate: g.governorate, areaId: a.area, areaName: a.area_name })),
  );
  const name = norm(saved.areaName ?? "");
  if (saved.areaId) {
    // Ids from other area lists exist in old addresses; trust the id only if the name agrees.
    const byId = all.find((a) => a.areaId === String(saved.areaId));
    if (byId && (!name || norm(byId.areaName).startsWith(name))) return byId;
  }
  if (!name) return null;
  const inGovernorate = (list: Match[]) => {
    const g = norm(saved.governorate ?? "");
    const scoped = list.filter((a) => norm(a.governorate) === g);
    return scoped.length ? scoped : list;
  };

  const exact = inGovernorate(all.filter((a) => norm(a.areaName) === name));
  if (exact.length) return exact[0];

  const prefixed = inGovernorate(all.filter((a) => norm(a.areaName).startsWith(name)));
  if (prefixed.length === 1) return prefixed[0];
  const block = Number(saved.block?.match(/\d+/)?.[0]);
  if (prefixed.length > 1 && block) {
    const byBlock = prefixed.find((a) => blocksOf(a.areaName)?.has(block));
    if (byBlock) return byBlock;
  }
  return null;
}
