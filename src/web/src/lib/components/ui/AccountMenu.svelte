<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import { getLocale, setLocale, locales } from "$lib/paraglide/runtime";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import type { SessionUser } from "$lib/types/session";

	let { user, onNavigate }: { user: SessionUser; onNavigate?: () => void } = $props();

	let open = $state(false);
	let root: HTMLDivElement | undefined = $state();

	const isAdmin = $derived(user.platform_role <= 1);
	const hasShelter = $derived(user.memberships.length > 0);
	const name = $derived(user.displayName ?? user.name);

	function close() {
		open = false;
	}

	function go() {
		close();
		onNavigate?.();
	}

	$effect(() => {
		page.url.pathname;
		close();
	});

	$effect(() => {
		if (!open) return;
		function onPointer(event: PointerEvent) {
			if (root && !root.contains(event.target as Node)) close();
		}
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape") close();
		}
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	});
</script>

<div class="relative" bind:this={root}>
	<button
		type="button"
		class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus-ring"
		aria-expanded={open}
		aria-haspopup="menu"
		aria-label={m.header_account_menu()}
		onclick={() => (open = !open)}
	>
		<Avatar {name} hasAvatar={user.hasAvatar} size="sm" />
	</button>
	{#if open}
		<ul
			role="menu"
			class="absolute top-full right-0 z-50 mt-1 min-w-48 rounded-xl border border-sand-200 bg-white py-1 shadow-md"
		>
			<li role="none" class="px-2 py-1 sm:hidden">
				<div
					class="inline-flex items-center rounded-full border border-sand-200 p-0.5"
					role="group"
					aria-label={m.header_locale_label()}
				>
					{#each locales as locale (locale)}
						<button
							type="button"
							role="menuitem"
							onclick={() => setLocale(locale)}
							aria-pressed={getLocale() === locale}
							class="min-h-11 min-w-11 cursor-pointer rounded-full px-2 text-xs font-bold uppercase focus-ring {getLocale() ===
							locale
								? 'bg-coral-600 text-white'
								: 'text-sand-600 hover:text-coral-700'}"
						>
							{locale}
						</button>
					{/each}
				</div>
			</li>
			<li role="none">
				<a
					role="menuitem"
					href={resolve("/profile")}
					class="block min-h-11 truncate px-3 py-2.5 text-sm font-semibold text-sand-800 hover:bg-peach-50"
					onclick={go}
				>
					{m.header_profile()}
				</a>
			</li>
			<li role="none">
				<a
					role="menuitem"
					href={resolve("/app")}
					class="block min-h-11 truncate px-3 py-2.5 text-sm font-semibold text-sand-800 hover:bg-peach-50"
					onclick={go}
				>
					{m.header_app()}
				</a>
			</li>
			{#if hasShelter}
				<li role="none">
					<a
						role="menuitem"
						href={resolve("/shelter")}
						class="block min-h-11 truncate px-3 py-2.5 text-sm font-semibold text-sand-800 hover:bg-peach-50"
						onclick={go}
					>
						{m.header_shelter()}
					</a>
				</li>
			{/if}
			{#if isAdmin}
				<li role="none">
					<a
						role="menuitem"
						href={resolve("/admin")}
						class="block min-h-11 truncate px-3 py-2.5 text-sm font-semibold text-sand-800 hover:bg-peach-50"
						onclick={go}
					>
						{m.header_admin()}
					</a>
				</li>
			{/if}
			<li role="none">
				<form method="POST" action={resolve("/logout")}>
					<button
						type="submit"
						role="menuitem"
						class="min-h-11 w-full cursor-pointer truncate px-3 py-2.5 text-left text-sm font-semibold text-coral-700 hover:bg-coral-50"
					>
						{m.header_logout()}
					</button>
				</form>
			</li>
		</ul>
	{/if}
</div>
