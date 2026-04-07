import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				gold: "#D4AF37",
				"gold-light": "#F0D060",
				"gold-dark": "#B8962E",
				"near-black": "#1A1A1A",
				"gray-light": "#F2F2F2",
				"gray-border": "#E0E0E0",
			},
		},
	},
	plugins: [],
};

export default config;
