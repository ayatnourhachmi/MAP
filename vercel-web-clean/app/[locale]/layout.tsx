import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../intl/routing";

type LocaleLayoutProps = {
	children: ReactNode;
	params: { locale: string };
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
	if (!routing.locales.includes(params.locale as any)) {
		notFound();
	}

	const messages = await getMessages();
	const isRtl = params.locale === "ar" || params.locale === "ar-MA";

	return (
		<NextIntlClientProvider messages={messages}>
			<section lang={params.locale} dir={isRtl ? "rtl" : "ltr"}>
				{children}
			</section>
		</NextIntlClientProvider>
	);
}
