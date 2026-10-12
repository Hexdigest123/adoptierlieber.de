import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig(({ command }) => ({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
			},
			adapter: adapter(),
			// `vite dev` reads the repo-root .env (shared with the API). Builds keep the default,
			// so a local .env never reaches a deploy; Workers get PUBLIC_API_URL from wrangler vars.
			env: { dir: command === "serve" ? "../.." : "." },
			// Nonces on SSR pages, hashes on prerendered ones. hooks.server.ts adds
			// frame-ancestors only to responses that do not already carry this policy.
			csp: {
				mode: "auto",
				directives: {
					"default-src": ["self"],
					// Cloudflare Turnstile (register, contact, forgot-password) loads its script
					// and challenge iframe from challenges.cloudflare.com.
					"script-src": ["self", "https://challenges.cloudflare.com"],
					"frame-src": ["https://challenges.cloudflare.com"],
					// Svelte transitions and Leaflet write inline styles.
					"style-src": ["self", "unsafe-inline"],
					// data:/blob: for upload previews and the TOTP QR; OSM tiles for ShelterMap.
					"img-src": ["self", "data:", "blob:", "https://tile.openstreetmap.org"],
					// Fonts are self-hosted (fontsource); the chat socket is same-origin.
					"font-src": ["self"],
					"connect-src": ["self"],
					"object-src": ["none"],
					"base-uri": ["none"],
					"form-action": ["self"],
					"frame-ancestors": ["none"],
				},
			},
		}),

		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/lib/paraglide",
			emitTsDeclarations: true,
		}),
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: "./vite.config.ts",
				test: {
					name: "client",
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: "chromium", headless: true }],
					},
					include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
					exclude: ["src/lib/server/**"],
				},
			},

			{
				extends: "./vite.config.ts",
				test: {
					name: "server",
					environment: "node",
					include: ["src/**/*.{test,spec}.{js,ts}"],
					exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
				},
			},
		],
	},
}));
