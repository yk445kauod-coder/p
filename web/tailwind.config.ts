import type { Config } from "tailwindcss";

const config = {
	mode: "jit",
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			fontFamily: {
				// Latin leads, Arabic falls back per glyph, so a mixed string renders
				// each script in its own IBM Plex cut without branching on language.
				sans: [
					"var(--font-latin)",
					"var(--font-arabic)",
					"system-ui",
					"-apple-system",
					"sans-serif",
				],
				arabic: ["var(--font-arabic)", "var(--font-latin)", "system-ui", "sans-serif"],
				serif: ["var(--font-arabic)", "Georgia", "serif"],
				mono: ["ui-monospace", "SFMono-Regular", "monospace"],
			},
			colors: {
				border: "hsl(var(--border))",
				"border-strong": "hsl(var(--border-strong))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					soft: "hsl(var(--primary-soft))",
					strong: "hsl(var(--primary-strong))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					soft: "hsl(var(--destructive-soft))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				teal: {
					DEFAULT: "hsl(var(--teal))",
					soft: "hsl(var(--teal-soft))",
					strong: "hsl(var(--teal-strong))",
					foreground: "hsl(var(--teal-foreground))",
				},
				violet: {
					DEFAULT: "hsl(var(--violet))",
					soft: "hsl(var(--violet-soft))",
					strong: "hsl(var(--violet-strong))",
					foreground: "hsl(var(--violet-foreground))",
				},
				rose: {
					DEFAULT: "hsl(var(--rose))",
					soft: "hsl(var(--rose-soft))",
					strong: "hsl(var(--rose-strong))",
					foreground: "hsl(var(--rose-foreground))",
				},
				indigo: {
					DEFAULT: "hsl(var(--indigo))",
					soft: "hsl(var(--indigo-soft))",
					strong: "hsl(var(--indigo-strong))",
					foreground: "hsl(var(--indigo-foreground))",
				},
				success: {
					DEFAULT: "hsl(var(--success))",
					soft: "hsl(var(--success-soft))",
					foreground: "hsl(var(--success-foreground))",
				},
				warning: {
					DEFAULT: "hsl(var(--warning))",
					soft: "hsl(var(--warning-soft))",
					foreground: "hsl(var(--warning-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
