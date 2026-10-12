<script lang="ts">
	import { onMount } from "svelte";
	import { m } from "$lib/paraglide/messages";
	import { getLocale } from "$lib/paraglide/runtime";
	import Button from "$lib/components/ui/Button.svelte";
	import { loadTurnstile, turnstileSiteKey, type TurnstileApi } from "$lib/turnstile";

	type Props = {
		/** The API checks it against the endpoint the form posts to. */
		action: "register" | "contact" | "reset";
		/** Current token; "" until solved and after it expired. */
		token?: string;
		class?: string;
	};

	let { action, token = $bindable(""), class: className = "" }: Props = $props();

	const siteKey = turnstileSiteKey();
	// The flexible widget needs 300px; narrow cards get the compact one.
	const MIN_FLEXIBLE_WIDTH = 300;

	let container: HTMLDivElement | undefined = $state();
	// "unavailable": the script did not load; "failed": the challenge errored.
	let problem = $state<"unavailable" | "failed" | null>(null);
	let api: TurnstileApi | undefined;
	let widgetId: string | undefined;
	let destroyed = false;

	/** Tokens are single-use: call after every submit that did not leave the page. */
	export function reset() {
		token = "";
		if (!api || widgetId === undefined) return;
		problem = null;
		api.reset(widgetId);
	}

	function renderWidget(target: HTMLElement) {
		problem = null;
		loadTurnstile()
			.then((turnstile) => {
				if (destroyed) return;
				api = turnstile;
				widgetId = turnstile.render(target, {
					sitekey: siteKey,
					action,
					language: getLocale(),
					theme: "light",
					size: target.clientWidth < MIN_FLEXIBLE_WIDTH ? "compact" : "flexible",
					callback: (value) => {
						token = value;
						problem = null;
					},
					"expired-callback": () => (token = ""),
					"error-callback": () => {
						token = "";
						problem = "failed";
					},
				});
				// render() returns undefined when it rejects its options.
				if (widgetId === undefined) problem = "failed";
			})
			.catch(() => {
				if (!destroyed) problem = "unavailable";
			});
	}

	function retry() {
		if (api && widgetId !== undefined) reset();
		else if (container) renderWidget(container);
	}

	onMount(() => {
		const target = container;
		if (!siteKey || !target) return;
		// A re-mounted widget must not inherit the spent token of the last one.
		if (token) token = "";
		destroyed = false;
		// Load Cloudflare's script only once the form is near the viewport, so the
		// landing page's contact form costs visitors nothing until they get there.
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				renderWidget(target);
			},
			{ rootMargin: "200px" },
		);
		observer.observe(target);
		return () => {
			destroyed = true;
			observer.disconnect();
			if (api && widgetId !== undefined) api.remove(widgetId);
		};
	});
</script>

{#if siteKey}
	<div class={className}>
		<div bind:this={container} class="min-h-[65px]"></div>
		{#if problem}
			<p class="mt-2 text-sm text-coral-800" role="alert">
				{problem === "unavailable" ? m.turnstile_unavailable() : m.turnstile_failed()}
			</p>
			<Button type="button" variant="outline" size="sm" class="mt-2" onclick={retry}>
				{m.turnstile_retry()}
			</Button>
		{/if}
	</div>
{/if}
