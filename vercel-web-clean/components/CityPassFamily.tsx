"use client";

import { motion } from "framer-motion";

type CityPass = {
  city: string;
  status: "available" | "comingSoon";
};

type CityPassFamilyProps = {
  familyText: string;
  familySuffix: string;
  byLabel: string;
  availableLabel: string;
  comingSoonLabel: string;
  passes: CityPass[];
  showBrand?: boolean;
};

export default function CityPassFamily({
  familyText,
  familySuffix,
  byLabel,
  availableLabel,
  comingSoonLabel,
  passes,
  showBrand = true,
}: CityPassFamilyProps) {
  const marqueePasses = [...passes, ...passes];

  return (
    <section className={showBrand ? "rounded-[2rem] border border-[#E0E0E0] bg-white p-6 shadow-[0_14px_35px_rgba(26,26,26,0.08)] md:p-10" : ""}>
      <div className={showBrand ? "container-main" : ""}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col gap-8"
        >
          <p className="max-w-[320px] text-center text-lg font-semibold text-[#1A1A1A] lg:max-w-[260px] lg:text-left md:text-xl">
            {familyText}
            {showBrand && (
              <>
                <br />
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>My Atlas Pass®</span>
              </>
            )}
            {familySuffix ? ` ${familySuffix}` : ""}
          </p>

          <div className="relative overflow-hidden">
            <motion.div
              className="flex w-max items-center gap-8"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 28, ease: "linear", repeat: Infinity }}
            >
              {marqueePasses.map((pass, index) => {
                const isComingSoon = pass.status === "comingSoon";
                const passLabel = isComingSoon ? comingSoonLabel : availableLabel;

                return (
                  <a
                    key={`${pass.city}-${index}`}
                    href="#"
                    className={[
                      "group flex shrink-0 items-baseline gap-2 transition-opacity hover:opacity-75",
                      isComingSoon ? "opacity-70" : "opacity-100",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "border-2 px-2 py-1 leading-none",
                        isComingSoon ? "border-[#B7B7B7]" : "border-[#C8A96A]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "block text-xs font-bold uppercase",
                          isComingSoon ? "text-[#9A9A9A]" : "text-[#C8A96A]",
                        ].join(" ")}
                      >
                        My
                      </span>
                      <span
                        className={[
                          "block text-lg font-extrabold uppercase tracking-tight md:text-xl",
                          isComingSoon ? "text-[#9A9A9A]" : "text-[#C8A96A]",
                        ].join(" ")}
                      >
                        {pass.city}
                      </span>
                      <span
                        className={[
                          "block text-xs font-bold uppercase",
                          isComingSoon ? "text-[#9A9A9A]" : "text-[#C8A96A]",
                        ].join(" ")}
                      >
                        PASS®
                      </span>
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium text-[#888888]">{byLabel}</span>
                      <span
                        className={[
                          "text-xs font-bold uppercase",
                          isComingSoon ? "text-[#9A9A9A]" : "text-[#C8A96A]",
                        ].join(" ")}
                      >
                        {passLabel}
                      </span>
                    </div>
                  </a>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
