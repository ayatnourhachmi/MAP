"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

import CityPassFamily from "../components/CityPassFamily";
import LanguageSwitcher from "../components/LanguageSwitcher";
import SarahVideo from "../components/SarahVideo";
import { usePathname, useRouter } from "../intl/navigation";
import type { AppLocale } from "../intl/routing";

const videos: Record<string, string> = {
  en: "/videos/sarah-en.mp4",
  fr: "/videos/sarah-fr.mp4",
  ar: "/videos/sarah-ar.mp4",
  es: "/videos/sarah-es.mp4",
  ja: "/videos/sarah-ja.mp4",
  zh: "/videos/sarah-zh.mp4",
  ko: "/videos/sarah-ko.mp4",
  darija: "/videos/sarah-darija.mp4",
};

const supportedLocales: AppLocale[] = ["en", "fr", "es", "ar", "ja", "zh", "ko", "darija"];
const REFRESH_VIDEO = "/videos/ComingSoonMAP-Refresh.mp4";

const mosaicCountries = [
  { country: "Morocco", status: "available" as const, image: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=1200&q=80" },
  { country: "UAE", status: "available" as const, image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80" },
  { country: "Spain", status: "available" as const, image: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80" },
  { country: "USA", status: "available" as const, image: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=1200&q=80" },
  { country: "Portugal", status: "available" as const, image: "https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=1200&q=80" },
  { country: "France", status: "available" as const, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80" },
  { country: "Japan", status: "available" as const, image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80" },
  { country: "Qatar", status: "comingSoon" as const, image: "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1200&q=80" },
  { country: "Italy", status: "comingSoon" as const, image: "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80" },
  { country: "Korea", status: "comingSoon" as const, image: "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1200&q=80" },
  { country: "Canada", status: "comingSoon" as const, image: "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1200&q=80" },
  { country: "Mexico", status: "comingSoon" as const, image: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1200&q=80" },
  { country: "Turkey", status: "comingSoon" as const, image: "https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=80" },
  { country: "India", status: "comingSoon" as const, image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80" },
];

export default function ComingSoon() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [hasPlayedRefreshVideo, setHasPlayedRefreshVideo] = useState(false);

  const language = (supportedLocales.includes(locale as AppLocale) ? locale : "en") as AppLocale;

  const languageOptions = useMemo(
    () => [
      { code: "en", label: t("comingSoon.languages.en") },
      { code: "fr", label: t("comingSoon.languages.fr") },
      { code: "es", label: t("comingSoon.languages.es") },
      { code: "ar", label: t("comingSoon.languages.ar") },
      { code: "ja", label: t("comingSoon.languages.ja") },
      { code: "zh", label: t("comingSoon.languages.zh") },
      { code: "ko", label: t("comingSoon.languages.ko") },
      { code: "darija", label: t("comingSoon.languages.darija") },
    ],
    [t],
  );

  const passCards = useMemo(
    () => [
      { city: "Morocco", status: "available" as const },
      { city: "UAE", status: "available" as const },
      { city: "Spain", status: "available" as const },
      { city: "USA", status: "available" as const },
      { city: "Portugal", status: "available" as const },
      { city: "France", status: "available" as const },
      { city: "Japan", status: "available" as const },
      { city: "Qatar", status: "comingSoon" as const },
      { city: "Italy", status: "comingSoon" as const },
      { city: "Korea", status: "comingSoon" as const },
      { city: "Canada", status: "comingSoon" as const },
      { city: "Mexico", status: "comingSoon" as const },
      { city: "Turkey", status: "comingSoon" as const },
      { city: "India", status: "comingSoon" as const },
    ],
    [],
  );

  const currentVideo = videos[language] ?? videos.en;
  const activeVideo = hasPlayedRefreshVideo ? currentVideo : REFRESH_VIDEO;
  const isRtl = language === "ar" || language === "darija";

  const onLanguageChange = (nextLanguage: string) => {
    if (!supportedLocales.includes(nextLanguage as AppLocale)) return;
    router.replace(pathname, { locale: nextLanguage as AppLocale });
  };

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#1A1A1A]">
      <section className="relative overflow-hidden px-6 pb-16 pt-0 md:px-12">
        <div className="-mx-6 bg-[#C8A96A] px-6 py-4 text-center text-white shadow-[0_10px_30px_rgba(200,169,106,0.22)] md:-mx-12 md:px-12">
          <p className="mx-auto max-w-none text-base leading-relaxed text-white">
            Explore our global passes <span className="font-bold">My Atlas Pass®</span> Available now and upcoming launches
          </p>
        </div>

        <CityPassFamily
          familyText=""
          familySuffix=""
          byLabel={t("cityPass.byLabel")}
          availableLabel={t("comingSoon.availableBadge")}
          comingSoonLabel={t("badge.comingSoon")}
          passes={passCards}
          showBrand={false}
        />

        <div className="relative mx-auto mt-20 flex max-w-7xl flex-col gap-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#B8962E]">{t("comingSoon.heroKicker")}</p>
              <h1 className="mt-4 text-5xl leading-tight md:text-6xl" style={{ fontFamily: '"Playfair Display", "Times New Roman", serif' }}>
                {t("comingSoon.title")}
              </h1>
              <p className="mt-3 text-xl text-[#555555]">{t("comingSoon.subtitle")}</p>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#666666]">{t("comingSoon.description")}</p>
              
              <div className="mt-8">
                <LanguageSwitcher value={language} options={languageOptions} onChange={onLanguageChange} />
              </div>
            </div>

            <SarahVideo
              src={activeVideo}
              title={hasPlayedRefreshVideo ? `Sarah concierge video - ${language}` : "My Atlas Pass refresh video"}
              loop={false}
              onEnded={() => setHasPlayedRefreshVideo(true)}
              onError={() => setHasPlayedRefreshVideo(true)}
            />
          </div>
        </div>
      </section>

{/* Themed Pass Family Section 
      <section className="mx-auto max-w-7xl px-6 py-8 md:px-12">
        <CityPassFamily
          familyText={t("cityPass.familyText")}
          familySuffix={t("cityPass.familySuffix")}
          byLabel={t("cityPass.byLabel")}
          availableLabel={t("comingSoon.availableBadge")}
          comingSoonLabel={t("badge.comingSoon")}
          passes={passCards}
        />
      </section>*/}

      <section className="overflow-hidden py-10">
        {/*<div className="mx-auto mb-7 flex max-w-7xl items-center justify-between px-6 md:px-12">
          <h3 className="text-2xl md:text-3xl" style={{ fontFamily: '"Playfair Display", "Times New Roman", serif' }}>
            {t("comingSoon.mosaicTitle")}
          </h3>
        </div>*/}

        <div className="relative">
          <motion.div
            className="flex w-max gap-4 px-6 md:px-12"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, ease: "linear", repeat: Infinity }}
          >
            {[...mosaicCountries, ...mosaicCountries].map((item, index) => {
              const isComingSoon = item.status === "comingSoon";

              return (
                <div
                  key={`${item.country}-${index}`}
                  className="relative h-44 w-72 shrink-0 overflow-hidden rounded-2xl border border-[#E0E0E0] bg-white shadow-[0_10px_30px_rgba(26,26,26,0.08)]"
                >
                  <img
                    src={item.image}
                    alt={`${item.country} travel destination`}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.42))]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="rounded-2xl border border-white/40 bg-black/20 px-4 py-3 backdrop-blur-[1px]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                        My Atlas Pass
                      </p>
                      <p className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-white md:text-3xl">
                        {item.country}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
                        {isComingSoon ? t("badge.comingSoon") : t("comingSoon.availableBadge")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </main>
  );
}
