<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import type { ShelterChecklist, StaffShelter } from "$lib/types/shelter";

	type StepId = "profile" | "team" | "notify" | "form" | "first_animal" | "go_live";

	type Props = {
		shelter: StaffShelter;
		readonly: boolean;
		force?: boolean;
		hasAnimals?: boolean;
	};

	let { shelter, readonly, force = false, hasAnimals = false }: Props = $props();

	let hidden = $state(false);
	let saving = $state(false);

	const steps: { id: StepId; href: string }[] = [
		{ id: "profile", href: "/shelter/settings" },
		{ id: "team", href: "/shelter/settings/team" },
		{ id: "notify", href: "/shelter/settings" },
		{ id: "form", href: "/shelter/settings/form" },
		{ id: "first_animal", href: "/shelter/animals/new" },
		{ id: "go_live", href: "/shelter/animals?status=draft" },
	];

	function done(list: ShelterChecklist, id: StepId): boolean {
		if (id === "go_live")
			return shelter.verification_status === "verified" && (Boolean(list.first_animal) || hasAnimals);
		if (id === "first_animal") return Boolean(list.first_animal) || hasAnimals;
		return Boolean(list[id]);
	}

	const open = $derived.by(() => {
		if (hidden || readonly) return null;
		if (shelter.checklist.dismissed && !force) return null;
		return steps.find((step) => !done(shelter.checklist, step.id)) ?? null;
	});

	const index = $derived(open ? steps.findIndex((step) => step.id === open.id) + 1 : 0);

	function label(id: StepId): string {
		switch (id) {
			case "profile":
				return m.shelter_coach_profile();
			case "team":
				return m.shelter_coach_team();
			case "notify":
				return m.shelter_coach_notify();
			case "form":
				return m.shelter_coach_form();
			case "first_animal":
				return m.shelter_coach_animal();
			case "go_live":
				return shelter.verification_status === "verified"
					? m.shelter_coach_publish()
					: m.shelter_coach_wait();
		}
	}

	async function patch(body: ShelterChecklist) {
		saving = true;
		try {
			await fetch(`/api/shelters/${shelter.id}/checklist`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
		} finally {
			saving = false;
		}
	}

	async function later() {
		if (!open) return;
		hidden = true;
		if (open.id === "team" || open.id === "form") {
			await patch({ [open.id]: true });
		}
	}

	async function dismissAll() {
		hidden = true;
		await patch({ dismissed: true });
	}
</script>

{#if open}
	<aside
		class="fixed right-4 bottom-24 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-sand-200 bg-white p-4 shadow-lg md:bottom-6"
		aria-label={m.shelter_coach_title()}
	>
		<p class="text-xs font-semibold tracking-wide text-sand-500 uppercase">
			{m.shelter_coach_step({ current: String(index), total: String(steps.length) })}
		</p>
		<p class="mt-1 text-sm leading-relaxed text-sand-800">{label(open.id)}</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<Button href={open.href} size="sm">{m.shelter_coach_cta()}</Button>
			<Button variant="ghost" size="sm" disabled={saving} onclick={later}
				>{m.shelter_coach_later()}</Button
			>
		</div>
		<button
			type="button"
			class="mt-2 cursor-pointer text-xs font-semibold text-sand-500 underline focus-ring"
			disabled={saving}
			onclick={dismissAll}
		>
			{m.shelter_coach_hide()}
		</button>
	</aside>
{/if}
