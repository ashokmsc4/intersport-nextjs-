import type { Dictionary } from "@/i18n/dictionaries";

export function Footer({ dict }: { dict: Dictionary }) {
  return (
    <footer className="border-t border-neutral-200 py-6 text-center text-sm text-neutral-500">
      © {new Date().getFullYear()} {dict.site.name}. {dict.footer.rights}
    </footer>
  );
}
