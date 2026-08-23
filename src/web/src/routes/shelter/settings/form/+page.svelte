<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Checkbox from "$lib/components/ui/Checkbox.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import type { ApplicationField, ApplicationFieldType } from "$lib/types/shelter";

	let { data }: PageProps = $props();

	let fields = $state<ApplicationField[]>(structuredClone(data.fields));
	let optionDrafts = $state<Record<string, string>>({});
	let saved = $state(false);
	let error = $state("");
	let saving = $state(false);

	const locked = $derived(!data.isOwner || data.readonly);

	function addField() {
		if (fields.length >= 12) return;
		fields = [
			...fields,
			{
				id: crypto.randomUUID(),
				type: "short",
				label: "",
				required: false,
				options: [],
			},
		];
	}

	function remove(id: string) {
		fields = fields.map((field) => (field.id === id ? { ...field, hidden: true } : field));
	}

	async function save() {
		saving = true;
		error = "";
		saved = false;
		const payload = fields.map((field) => ({
			...field,
			label: field.label.trim(),
			options: field.type === "select" ? (field.options ?? []).filter(Boolean) : undefined,
		}));
		const response = await fetch(`/api/shelters/${data.current!.shelter_id}/form`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		});
		saving = false;
		if (!response.ok) {
			error = m.error_invalid_input();
			return;
		}
		saved = true;
		await fetch(`/api/shelters/${data.current!.shelter_id}/checklist`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ form: true }),
		});
	}

	function typeLabel(type: ApplicationFieldType): string {
		if (type === "long") return m.shelter_form_long();
		if (type === "select") return m.shelter_form_select();
		if (type === "yesno") return m.shelter_form_yesno();
		return m.shelter_form_short();
	}

	function optionList(field: ApplicationField): string[] {
		return (field.options ?? []).filter(Boolean);
	}

	function addOption(field: ApplicationField) {
		const raw = (optionDrafts[field.id] ?? "").trim();
		if (!raw || raw.length > 80) return;
		const options = optionList(field);
		if (options.includes(raw) || options.length >= 20) return;
		field.options = [...options, raw];
		optionDrafts[field.id] = "";
	}

	function removeOption(field: ApplicationField, index: number) {
		field.options = optionList(field).filter((_, i) => i !== index);
	}
</script>

<p class="text-center text-sm text-sand-700">{m.shelter_form_subtitle()}</p>

<ul class="mt-6 flex flex-col gap-4">
	{#each fields as field, index (field.id)}
		{#if !field.hidden}
			<li class="rounded-2xl border border-sand-200 bg-white p-4">
				<div class="flex items-center justify-between gap-2">
					<p class="text-xs font-semibold text-sand-500">{index + 1}</p>
					{#if !locked}
						<button
							type="button"
							class="text-xs font-semibold text-coral-700"
							onclick={() => remove(field.id)}
						>
							{m.shelter_form_hide()}
						</button>
					{/if}
				</div>
				<div class="mt-3 grid gap-3">
					<Input
						id="lab-{field.id}"
						label={m.shelter_form_label()}
						bind:value={field.label}
						disabled={locked}
					/>
					<div class="flex flex-col gap-1.5">
						<label for="type-{field.id}" class="text-sm font-semibold text-sand-900"
							>{m.shelter_form_type()}</label
						>
						<select
							id="type-{field.id}"
							bind:value={field.type}
							disabled={locked}
							class="h-11 rounded-xl border border-sand-300 bg-white px-3.5 focus-ring"
						>
							<option value="short">{typeLabel("short")}</option>
							<option value="long">{typeLabel("long")}</option>
							<option value="select">{typeLabel("select")}</option>
							<option value="yesno">{typeLabel("yesno")}</option>
						</select>
					</div>
					<Checkbox
						id="req-{field.id}"
						checked={field.required}
						disabled={locked}
						onchange={(event) => (field.required = event.currentTarget.checked)}
					>
						{m.shelter_form_required()}
					</Checkbox>
					{#if field.type === "select"}
						<div class="flex flex-col gap-1.5">
							<p class="text-sm font-semibold text-sand-900" id="opt-label-{field.id}">
								{m.shelter_form_options()}
							</p>
							{#if optionList(field).length}
								<ul class="flex flex-wrap gap-2" aria-labelledby="opt-label-{field.id}">
									{#each optionList(field) as option, optionIndex (`${field.id}-${optionIndex}`)}
										<li
											class="inline-flex items-center gap-1 rounded-full border border-sand-200 bg-sand-50 px-3 py-1.5 text-sm font-semibold text-sand-800"
										>
											{option}
											{#if !locked}
												<button
													type="button"
													class="rounded-full text-sand-500 focus-ring hover:text-coral-700"
													aria-label={m.shelter_form_option_remove({ option })}
													onclick={() => removeOption(field, optionIndex)}
												>
													×
												</button>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
							{#if !locked}
								<div class="flex gap-2">
									<input
										id="opt-{field.id}"
										class="h-11 min-w-0 flex-1 rounded-xl border border-sand-300 bg-white px-3.5 text-base text-sand-900 focus-ring placeholder:text-sand-400 hover:border-sand-400"
										placeholder={m.shelter_form_option_placeholder()}
										maxlength="80"
										aria-labelledby="opt-label-{field.id}"
										aria-describedby="opt-hint-{field.id}"
										value={optionDrafts[field.id] ?? ""}
										oninput={(event) => {
											optionDrafts[field.id] = event.currentTarget.value;
										}}
										onkeydown={(event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												addOption(field);
											}
										}}
									/>
									<Button
										variant="secondary"
										onclick={() => addOption(field)}
										disabled={!(optionDrafts[field.id] ?? "").trim() ||
											optionList(field).length >= 20}
									>
										{m.shelter_form_option_add()}
									</Button>
								</div>
								<p id="opt-hint-{field.id}" class="text-sm text-sand-600">
									{m.shelter_form_options_hint()}
								</p>
							{/if}
						</div>
					{/if}
				</div>
			</li>
		{/if}
	{/each}
</ul>

{#if saved}
	<FormStatus class="mt-4" type="success">{m.shelter_saved()}</FormStatus>
{:else if error}
	<FormStatus class="mt-4" type="error">{error}</FormStatus>
{/if}

{#if !locked}
	<div class="mt-4 flex flex-wrap gap-2">
		<Button
			variant="secondary"
			onclick={addField}
			disabled={fields.filter((f) => !f.hidden).length >= 12}
		>
			{m.shelter_form_add()}
		</Button>
		<Button onclick={save} loading={saving}>{m.profile_save()}</Button>
	</div>
{/if}

<section class="mt-10 rounded-2xl border border-sand-200 bg-sand-50 p-5">
	<h2 class="font-bold text-sand-950">{m.shelter_form_preview()}</h2>
	<ul class="mt-3 flex flex-col gap-2">
		{#each fields.filter((f) => !f.hidden) as field (field.id)}
			<li class="text-sm text-sand-800">
				{field.label || m.shelter_form_label()}
				{#if field.required}<span class="text-coral-600">*</span>{/if}
				<span class="text-sand-500">({typeLabel(field.type)})</span>
			</li>
		{/each}
		{#if fields.filter((f) => !f.hidden).length === 0}
			<li class="text-sm text-sand-600">{m.shelter_form_empty()}</li>
		{/if}
	</ul>
</section>
