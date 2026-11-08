<script lang="ts">
	import type { PageProps } from "./$types";
	import { invalidateAll } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import AdminAnimalCardView from "$lib/components/admin/AdminAnimalCard.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { formatDate } from "$lib/admin/format";
	import { safeHttpUrl } from "$lib/safe-url";

	let { data }: PageProps = $props();
	const shelter = $derived(data.shelter);
	const websiteHref = $derived(safeHttpUrl(shelter.website));
	const owner = $derived(shelter.members.find((member) => member.role === 1) ?? shelter.members[0]);
	let actionError = $state(false);

	async function adminAction(path: string, body?: unknown) {
		actionError = false;
		try {
			const res = await fetch(path, {
				method: "POST",
				headers: body === undefined ? undefined : { "content-type": "application/json" },
				body: body === undefined ? undefined : JSON.stringify(body),
			});
			if (!res.ok) {
				actionError = true;
				return;
			}
			await invalidateAll();
		} catch {
			actionError = true;
		}
	}
</script>

<div class="mb-5">
	<a
		href="{resolve('/admin/catalog')}?type=shelters"
		class="text-sm font-medium text-coral-700 focus-ring hover:text-coral-800"
	>
		{m.admin_catalog_shelters()}
	</a>
	<h1 class="mt-2 text-2xl font-black tracking-tight text-sand-950">{shelter.org_name}</h1>
</div>

<div class="grid gap-4 lg:grid-cols-3">
	<Card class="lg:col-span-2">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex min-w-0 items-start gap-3">
				{#if shelter.has_logo}
					<img
						src="/api/shelters/{shelter.id}/logo"
						alt=""
						class="size-16 shrink-0 rounded-xl border border-sand-200 object-cover"
					/>
				{/if}
				<div class="min-w-0">
					<p class="text-xl font-bold text-sand-950">{shelter.org_name}</p>
					<p class="text-sm text-sand-700">{shelter.street}, {shelter.zip} {shelter.city}</p>
					{#if websiteHref}
						<a
							href={websiteHref}
							class="text-sm font-medium text-coral-700 underline underline-offset-2"
							target="_blank"
							rel="external noopener noreferrer"
						>
							{shelter.website}
						</a>
					{:else if shelter.website}
						<p class="text-sm break-all text-sand-700">{shelter.website}</p>
					{/if}
				</div>
			</div>
			<StatusPill status={shelter.verification_status} />
		</div>
		{#if shelter.description}
			<p class="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-sand-800">
				{shelter.description}
			</p>
		{/if}
		<dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
			<div>
				<dt class="font-medium text-sand-700">{m.admin_application_registration()}</dt>
				<dd>{shelter.registration_number ?? "—"}</dd>
			</div>
			<div>
				<dt class="font-medium text-sand-700">{m.admin_application_submitted()}</dt>
				<dd class="tabular-nums">{formatDate(shelter.created_at)}</dd>
			</div>
			{#if shelter.verification_decided_at}
				<div>
					<dt class="font-medium text-sand-700">{m.admin_shelter_decided()}</dt>
					<dd class="tabular-nums">{formatDate(shelter.verification_decided_at)}</dd>
				</div>
			{/if}
		</dl>
		{#if shelter.archived_at}
			<p class="mt-4 text-sm font-medium text-sand-700">{m.admin_shelter_archived()}</p>
		{/if}
		{#if shelter.verification_status === "pending"}
			<div class="mt-5">
				<Button href={resolve("/admin/applications/[id]", { id: shelter.id })} size="sm">
					{m.admin_shelter_review()}
				</Button>
			</div>
		{/if}
	</Card>

	{#if owner}
		<a
			href={resolve("/admin/catalog/users/[id]", { id: owner.user_id })}
			class="block rounded-2xl focus-ring"
		>
			<Card focusable>
				<p class="text-sm font-medium text-sand-600">{m.admin_shelter_owner()}</p>
				<div class="mt-3 flex items-center gap-3">
					<Avatar name={owner.name} userId={owner.user_id} hasAvatar={owner.has_avatar} size="sm" />
					<div>
						<p class="font-semibold text-sand-950">{owner.name}</p>
						<p class="text-sm text-sand-600">{owner.email}</p>
					</div>
				</div>
			</Card>
		</a>
	{:else}
		<Card>
			<p class="text-sm font-medium text-coral-800">{m.admin_shelter_orphaned()}</p>
		</Card>
	{/if}
</div>

{#if shelter.orphaned && !shelter.archived_at}
	<section class="mt-6 rounded-2xl border border-sand-200 bg-white p-5">
		<h2 class="text-lg font-bold text-sand-950">{m.admin_shelter_transfer()}</h2>
		<form
			class="mt-3 flex flex-wrap gap-2"
			onsubmit={async (event) => {
				event.preventDefault();
				const form = event.currentTarget;
				const value = String(new FormData(form).get("user_id") ?? "").trim();
				if (!value) return;
				await adminAction(`/api/admin/shelters/${shelter.id}/owner`, { user_id: value });
			}}
		>
			<Input
				id="shelter-transfer-user"
				class="min-w-56 flex-1"
				name="user_id"
				label={m.admin_shelter_transfer_user()}
				hideLabel
				required
				placeholder={m.admin_shelter_transfer_user()}
			/>
			<Button type="submit" size="sm">{m.admin_shelter_transfer()}</Button>
		</form>
		{#if actionError}
			<FormStatus type="error" class="mt-2">{m.admin_error_generic()}</FormStatus>
		{/if}
		<div class="mt-3">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={async () => {
					if (!confirm(m.admin_shelter_archive_confirm())) return;
					await adminAction(`/api/admin/shelters/${shelter.id}/archive`);
				}}
			>
				{m.admin_shelter_archive()}
			</Button>
		</div>
	</section>
{/if}

<section class="mt-6" aria-labelledby="admin-members">
	<h2 id="admin-members" class="mb-3 text-lg font-bold text-sand-950">
		{m.admin_shelter_members()}
	</h2>
	<div class="grid gap-3 md:grid-cols-2">
		{#each shelter.members as member (member.user_id)}
			<a
				href={resolve("/admin/catalog/users/[id]", { id: member.user_id })}
				class="block rounded-2xl focus-ring"
			>
				<Card padding="sm" focusable>
					<div class="flex items-center gap-3">
						<Avatar
							name={member.name}
							userId={member.user_id}
							hasAvatar={member.has_avatar}
							size="sm"
						/>
						<div>
							<p class="font-semibold text-sand-950">{member.name}</p>
							<p class="text-sm text-sand-600">{member.email}</p>
						</div>
					</div>
				</Card>
			</a>
		{/each}
	</div>
</section>

<section class="mt-6" aria-labelledby="admin-animals">
	<h2 id="admin-animals" class="mb-3 text-lg font-bold text-sand-950">
		{m.admin_shelter_animals()}
	</h2>
	{#if shelter.animals.length === 0}
		<p class="text-sm text-sand-600">{m.admin_empty_text()}</p>
	{:else}
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#each shelter.animals as animal (animal.id)}
				<AdminAnimalCardView {animal} />
			{/each}
		</div>
	{/if}
</section>
