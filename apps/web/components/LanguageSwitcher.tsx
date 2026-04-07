"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type LanguageOption = {
  code: string;
  label: string;
};

type LanguageSwitcherProps = {
  value: string;
  options: LanguageOption[];
  onChange: (value: string) => void;
};

export default function LanguageSwitcher({ value, options, onChange }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("languageSwitcher");

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 border border-[#1A1A1A] px-5 py-2.5 text-sm font-light tracking-wide text-[#1A1A1A] transition-all duration-200 hover:bg-[#1A1A1A] hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20H7m6-4v2m0-6V9m0 0a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="uppercase tracking-[0.15em] text-xs font-medium">{t("button")}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="mb-6 border-b border-[#E8E8E8] pb-4">
              <h2 className="text-lg font-light tracking-wide text-[#1A1A1A]">
                {t("title")}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {options.map((option) => (
                <button
                  key={option.code}
                  onClick={() => {
                    onChange(option.code);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 text-sm font-light transition-all duration-200 ${
                    value === option.code
                      ? "border-2 border-[#C8A96A] bg-[#FAF9F6] text-[#1A1A1A]"
                      : "border border-[#E0E0E0] bg-white text-[#1A1A1A] hover:border-[#1A1A1A]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full border border-[#1A1A1A] py-2.5 text-sm font-light tracking-wide text-[#1A1A1A] transition-all duration-200 hover:bg-[#1A1A1A] hover:text-white"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
