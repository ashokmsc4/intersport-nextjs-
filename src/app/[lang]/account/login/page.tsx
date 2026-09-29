import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCustomerToken } from "@/lib/session";
import { safeRedirect } from "@/lib/shopper";
import { LoginForm } from "@/components/forms/LoginForm";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/login">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).account.loginTitle };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[lang]/account/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const next = safeRedirect(
    ((await searchParams).next as string | undefined) ?? null,
    `/${lang}/account`,
  );
  if (await getCustomerToken()) redirect(next);
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">{dict.account.loginTitle}</h1>
      <LoginForm
        locale={lang}
        dict={{ account: dict.account, errors: dict.errors }}
        redirectTo={next}
      />
      <p className="mt-6 text-sm">
        {dict.account.noAccount}{" "}
        <Link
          href={`/${lang}/account/register?next=${encodeURIComponent(next)}`}
          className="font-semibold text-brand"
        >
          {dict.account.createAccount}
        </Link>
      </p>
    </div>
  );
}
