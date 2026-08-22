<script lang="ts">
	import Globe from "lucide-svelte/icons/globe";
	import Mail from "lucide-svelte/icons/mail";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Logo from "$lib/components/ui/Logo.svelte";

	const year = new Date().getFullYear();

	const socials = [
		{
			href: () => "https://x.com/h3xdigest",
			label: () => m.footer_social_x(),
			icon: "x" as const,
			external: true,
		},
		{
			href: () => "https://merckel.dev",
			label: () => m.footer_social_pierre(),
			icon: "globe" as const,
			external: true,
		},
		{
			href: () => `mailto:${m.legal_email()}`,
			label: () => m.footer_social_mail(),
			icon: "mail" as const,
			external: false,
		},
	];
</script>

<footer class="border-t border-sand-200 bg-sand-50 px-4 py-10 sm:px-6">
	<div
		class="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left"
	>
		<div class="flex flex-col items-center gap-3 sm:items-start">
			<a
				href={resolve("/")}
				class="rounded-full focus-ring"
				aria-label={m.brand_name()}
			>
				<Logo />
			</a>
			<p class="max-w-md text-sm text-sand-700">{m.footer_tagline()}</p>
		</div>
		<div class="flex flex-col items-center gap-4 sm:items-end">
			<nav aria-label={m.brand_name()} class="flex items-center gap-6">
				<a
					href={resolve("/impressum")}
					class="py-2 text-sm font-semibold text-sand-700 underline-offset-2 focus-ring hover:text-coral-700 hover:underline"
				>
					{m.footer_impressum()}
				</a>
				<a
					href={resolve("/datenschutz")}
					class="py-2 text-sm font-semibold text-sand-700 underline-offset-2 focus-ring hover:text-coral-700 hover:underline"
				>
					{m.footer_datenschutz()}
				</a>
			</nav>
			<nav aria-label={m.footer_socials()} class="flex items-center gap-2">
				{#each socials as social (social.icon)}
					<a
						href={social.href()}
						class="inline-flex size-10 items-center justify-center rounded-full text-sand-700 focus-ring hover:bg-sand-200 hover:text-coral-700"
						aria-label={social.label()}
						{...social.external ? { target: "_blank", rel: "me noopener noreferrer" } : {}}
					>
						{#if social.icon === "x"}
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
						{:else if social.icon === "mail"}
							<Mail class="size-4" aria-hidden="true" />
						{:else}
							<Globe class="size-4" aria-hidden="true" />
						{/if}
					</a>
				{/each}
			</nav>
		</div>
	</div>
	<p class="mx-auto mt-8 max-w-6xl text-center text-xs text-sand-600 sm:text-left">
		{m.footer_copyright({ year })}
	</p>
</footer>
