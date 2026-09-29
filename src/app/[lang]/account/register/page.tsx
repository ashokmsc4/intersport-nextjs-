import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCustomerToken } from "@/lib/session";
import { safeRedirect } from "@/lib/shopper";
import { SignupForm } from "@/components/forms/SignupForm";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/register">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).account.signupTitle };
}

export default async function RegisterPage({
  params,
  searchParams,
}: PageProps<"/[lang]/account/register">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const next = safeRedirect(
    ((await searchParams).next as string | undefined) ?? null,
    `/${lang}/account`,
  );
  if (await getCustomerToken()) redirect(next);
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">{dict.account.signupTitle}</h1>
      <SignupForm
        locale={lang}
        dict={{ account: dict.account, errors: dict.errors }}
        redirectTo={next}
      />
      <p className="mt-6 text-sm">
        {dict.account.haveAccount}{" "}
        <Link
          href={`/${lang}/account/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-brand"
        >
          {dict.account.signIn}
        </Link>
      </p>
    </div>
  );
}
