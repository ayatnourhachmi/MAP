import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "../../intl/routing";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import es from "../../messages/es.json";
import ar from "../../messages/ar.json";
import ja from "../../messages/ja.json";
import zh from "../../messages/zh.json";
import ko from "../../messages/ko.json";
import darija from "../../messages/darija.json";

const messagesByLocale: Record<string, unknown> = {
  en, fr, es, ar, ja, zh, ko, "ar-MA": darija,
};

type LocaleLayoutProps = {
  children: ReactNode;
  params: { locale: string };
};

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = messagesByLocale[locale] ?? en;
  const isRtl = locale === "ar" || locale === "ar-MA";

  return (
    <NextIntlClientProvider locale={locale} messages={messages as any}>
      <section lang={locale} dir={isRtl ? "rtl" : "ltr"}>
        {children}
      </section>
    </NextIntlClientProvider>
  );
}
