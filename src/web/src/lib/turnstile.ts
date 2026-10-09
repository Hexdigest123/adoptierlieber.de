import { env } from "$env/dynamic/public";

/** The explicit-render API the Cloudflare script puts on window.turnstile. */
export type TurnstileApi = {
	render(container: HTMLElement, options: TurnstileOptions): string | undefined;
	reset(widgetId: string): void;
	remove(widgetId: string): void;
};

type TurnstileOptions = {
	sitekey: string;
	action?: string;
	language?: string;
	theme?: "auto" | "light" | "dark";
	size?: "normal" | "flexible" | "compact";
	callback?: (token: string) => void;
	"expired-callback"?: () => void;
	"error-callback"?: (code: string) => void;
};

declare global {
	interface Window {
		turnstile?: TurnstileApi;
		onTurnstileLoad?: () => void;
	}
}

const SCRIPT_URL =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";

/** Hidden input the widget adds to its form. Form actions forward it as `turnstileToken`. */
export const TURNSTILE_FIELD = "cf-turnstile-response";

/** No site key, no widget: the forms work as before and the API skips the check. */
export function turnstileSiteKey(): string {
	return env.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

let loading: Promise<TurnstileApi> | null = null;

/** Injects the Cloudflare script once, when the first widget on a page renders. */
export function loadTurnstile(): Promise<TurnstileApi> {
	if (window.turnstile) return Promise.resolve(window.turnstile);
	loading ??= new Promise<TurnstileApi>((resolve, reject) => {
		window.onTurnstileLoad = () => {
			if (window.turnstile) resolve(window.turnstile);
			else reject(new Error("turnstile script loaded without its API"));
		};
		const script = document.createElement("script");
		script.src = SCRIPT_URL;
		script.async = true;
		script.onerror = () => {
			// Let a later widget (e.g. after a reconnect) try again.
			script.remove();
			loading = null;
			reject(new Error("turnstile script failed to load"));
		};
		document.head.appendChild(script);
	});
	return loading;
}

/** The API answers 403 { error: "captcha failed" } when Siteverify rejects the token. */
export async function isTurnstileRejection(response: Response): Promise<boolean> {
	if (response.status !== 403) return false;
	try {
		const body = (await response.clone().json()) as { error?: string };
		return body.error === "captcha failed";
	} catch {
		return false;
	}
}
