<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import type { UserPreferences } from "$lib/types/catalog";
	import { dialog } from "$lib/dialog";

	let {
		open = $bindable(false),
		ondone,
	}: {
		open?: boolean;
		ondone: () => void;
	} = $props();

	let step = $state(0);
	let species = $state<UserPreferences["species"]>("open");
	let home = $state<UserPreferences["home"]>("apartment");
	let withWho = $state<NonNullable<UserPreferences["with"]>>([]);
	let lifestyle = $state<UserPreferences["lifestyle"]>("cuddle");

	function toggleWith(tag: NonNullable<UserPreferences["with"]>[number]) {
		if (withWho.includes(tag)) withWho = withWho.filter((v) => v !== tag);
		else withWho = [...withWho, tag];
	}

	async function persist(skipped: boolean) {
		const preferences: UserPreferences = skipped
			? { onboarded: true, prefs_done: true }
			: { onboarded: true, prefs_done: true, species, home, with: withWho, lifestyle };
		try {
			await fetch("/api/users/me", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ preferences }),
			});
		} catch {
			// still close so the sheet cannot trap the user
		}
		open = false;
		ondone();
	}

	const questions = [
		{
			title: () => m.app_prefs_who(),
			options: [
				{ id: "dog", label: () => m.app_prefs_who_dog() },
				{ id: "cat", label: () => m.app_prefs_who_cat() },
				{ id: "small", label: () => m.app_prefs_who_small() },
				{ id: "bird", label: () => m.app_prefs_who_bird() },
				{ id: "open", label: () => m.app_prefs_who_open() },
			],
		},
		{
			title: () => m.app_prefs_home(),
			options: [
				{ id: "apartment", label: () => m.app_prefs_home_apartment() },
				{ id: "house", label: () => m.app_prefs_home_house() },
				{ id: "yard", label: () => m.app_prefs_home_yard() },
			],
		},
		{
			title: () => m.app_prefs_with(),
			options: [
				{ id: "kids", label: () => m.app_prefs_with_kids() },
				{ id: "dog", label: () => m.app_prefs_with_dog() },
				{ id: "cat", label: () => m.app_prefs_with_cat() },
				{ id: "alone", label: () => m.app_prefs_with_alone() },
			],
		},
		{
			title: () => m.app_prefs_life(),
			options: [
				{ id: "active", label: () => m.app_prefs_life_active() },
				{ id: "cuddle", label: () => m.app_prefs_life_cuddle() },
				{ id: "first", label: () => m.app_prefs_life_first() },
			],
		},
	];

	function selected(id: string): boolean {
		if (step === 0) return species === id;
		if (step === 1) return home === id;
		if (step === 2) return withWho.includes(id as NonNullable<UserPreferences["with"]>[number]);
		return lifestyle === id;
	}

	function choose(id: string) {
		if (step === 0) species = id as UserPreferences["species"];
		else if (step === 1) home = id as UserPreferences["home"];
		else if (step === 2) toggleWith(id as NonNullable<UserPreferences["with"]>[number]);
		else lifestyle = id as UserPreferences["lifestyle"];
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
		<button
			type="button"
			class="absolute inset-0 bg-sand-950/40"
			aria-label={m.dialog_close()}
			onclick={() => void persist(true)}
		></button>
		<div
			class="relative z-10 w-full max-w-md rounded-t-3xl border border-sand-200 bg-white p-6 shadow-lg sm:rounded-3xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="prefs-title"
			use:dialog={() => void persist(true)}
		>
			<h2 id="prefs-title" class="text-xl font-black text-sand-950">{m.app_prefs_title()}</h2>
			<p class="mt-2 text-sm text-sand-700">{m.app_prefs_text()}</p>
			<p class="mt-4 text-sm font-bold text-coral-700">{questions[step].title()}</p>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each questions[step].options as option (option.id)}
					<button
						type="button"
						aria-pressed={selected(option.id)}
						class="min-h-11 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold focus-ring {selected(
							option.id,
						)
							? 'border-coral-600 bg-coral-600 text-white'
							: 'border-sand-200 text-sand-800 hover:border-coral-300'}"
						onclick={() => choose(option.id)}
					>
						{option.label()}
					</button>
				{/each}
			</div>
			<div class="mt-6 flex flex-col gap-2">
				{#if step < 3}
					<Button fullWidth onclick={() => (step += 1)}>{m.app_prefs_next()}</Button>
				{:else}
					<Button fullWidth onclick={() => void persist(false)}>{m.app_prefs_done()}</Button>
				{/if}
				<Button variant="ghost" fullWidth onclick={() => void persist(true)}
					>{m.app_prefs_skip()}</Button
				>
			</div>
		</div>
	</div>
{/if}
