import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ResetForm } from "@/components/forms/ResetForm";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/forgot-password">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).account.resetTitle };
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[lang]/account/forgot-password">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.account;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold">{t.resetTitle}</h1>
      <p className="mb-6 text-sm text-neutral-600">{t.resetIntro}</p>
      <ResetForm locale={lang} dict={{ account: dict.account, errors: dict.errors }} />
      <Link
        href={`/${lang}/account/login`}
        className="mt-6 inline-block text-sm font-semibold text-brand"
      >
        {t.backToLogin}
      </Link>
    </div>
  );
}
