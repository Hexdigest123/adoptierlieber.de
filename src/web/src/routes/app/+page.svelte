<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import Card from "$lib/components/ui/Card.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import logoMark from "$lib/assets/logo.svg";
	import logiqLogo from "$lib/assets/logiq-logo.webp";

	const twitterUrl = "https://x.com/h3xdigest";
</script>

<div class="flex flex-1 items-center justify-center bg-peach-50 px-4 py-12 sm:px-6">
	<Card class="w-full max-w-md text-center" padding="lg">
		<div
			class="flex items-center justify-center gap-4 sm:gap-5"
			role="img"
			aria-label={m.app_collab()}
		>
			<img src={logoMark} alt="" class="size-14 shrink-0" width="56" height="56" />
			<span class="text-2xl font-black text-sand-400" aria-hidden="true">×</span>
			<img src={logiqLogo} alt="" class="h-10 w-auto sm:h-11" width="200" height="71" />
		</div>

		<h1 class="mt-8 text-3xl font-black tracking-tight text-sand-950">{m.app_title()}</h1>
		<p class="mt-2 text-sm leading-relaxed text-sand-700">{m.app_subtitle()}</p>

		<p class="mt-6 text-sm leading-relaxed text-sand-700">{m.app_follow()}</p>
		<div class="mt-4">
			<Button href={twitterUrl} target="_blank" rel="me noopener noreferrer">
				{#snippet iconLeft()}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="size-4"
						aria-hidden="true"
					>
						<path
							d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.725-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"
						/>
					</svg>
				{/snippet}
				{m.app_follow_cta()}
			</Button>
		</div>
	</Card>
</div>
