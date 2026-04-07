import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import type { AbstractIntlMessages } from "next-intl";

import en from "../messages/en.json";
import fr from "../messages/fr.json";
import es from "../messages/es.json";
import ar from "../messages/ar.json";
import ja from "../messages/ja.json";
import zh from "../messages/zh.json";
import ko from "../messages/ko.json";
import darija from "../messages/darija.json";

const messagesByLocale = {
  en,
  fr,
  es,
  ar,
  ja,
  zh,
  ko,
  darija,
} as Record<string, AbstractIntlMessages>;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    typeof requested === "string" && routing.locales.includes(requested as any)
      ? (requested as (typeof routing.locales)[number])
      : routing.defaultLocale;

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
