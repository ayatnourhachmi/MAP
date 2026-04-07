type PageProps = {
	params: { locale: string };
};

export default function ConciergePage({ params }: PageProps) {
	return (
		<main className="min-h-screen bg-[#FAF9F6] p-8 text-[#1A1A1A]">
			<div className="mx-auto max-w-4xl rounded-3xl border border-[#E0E0E0] bg-white p-10">
				<h1 className="text-3xl font-semibold">Concierge</h1>
				<p className="mt-3 text-[#666]">Locale: {params.locale}</p>
			</div>
		</main>
	);
}
