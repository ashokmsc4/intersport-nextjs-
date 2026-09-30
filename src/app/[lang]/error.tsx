"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

const TEXT = {
  en: {
    title: "This page couldn't load",
    body: "We couldn't reach the store right now. Please try again in a moment.",
    retry: "Try again",
    home: "Go to the home page",
  },
  ar: {
    title: "تعذر تحميل هذه الصفحة",
    body: "تعذر الوصول إلى المتجر حالياً. يرجى المحاولة مرة أخرى بعد قليل.",
    retry: "إعادة المحاولة",
    home: "الذهاب إلى الصفحة الرئيسية",
  },
};

/** Shown inside the site layout when a page fails on the server (e.g. Magento unreachable). */
export default function PageError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { lang } = useParams<{ lang: string }>();
  const locale = lang === "ar" ? "ar" : "en";
  const t = TEXT[locale];
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="text-neutral-600">{t.body}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded bg-brand px-5 py-2.5 font-semibold text-white hover:opacity-90"
        >
          {t.retry}
        </button>
        <Link href={`/${locale}`} className="rounded border border-neutral-300 px-5 py-2.5 font-semibold">
          {t.home}
        </Link>
      </div>
      {error.digest && (
        <p dir="ltr" className="font-mono text-xs text-neutral-400">
          ref {error.digest} · /api/health
        </p>
      )}
    </section>
  );
}
