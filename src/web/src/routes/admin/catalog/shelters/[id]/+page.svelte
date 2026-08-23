<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import AdminAnimalCardView from "$lib/components/admin/AdminAnimalCard.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { formatDate } from "$lib/admin/format";

	let { data }: PageProps = $props();
	const shelter = $derived(data.shelter);
	const owner = $derived(shelter.members.find((member) => member.role === 1) ?? shelter.members[0]);
</script>

<div class="mb-5">
	<a
		href="{resolve('/admin/catalog')}?type=shelters"
		class="text-sm font-semibold text-coral-700 focus-ring hover:text-coral-800"
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
					{#if shelter.website}
						<a
							href={shelter.website}
							class="text-sm font-semibold text-coral-700 underline underline-offset-2"
							target="_blank"
							rel="noopener noreferrer"
						>
							{shelter.website}
						</a>
					{/if}
				</div>
			</div>
			<StatusPill status={shelter.verification_status} />
		</div>
		{#if shelter.description}
			<p class="mt-4 text-sm leading-relaxed text-sand-800">{shelter.description}</p>
		{/if}
		<dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_application_registration()}</dt>
				<dd>{shelter.registration_number ?? "—"}</dd>
			</div>
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_application_submitted()}</dt>
				<dd class="tabular-nums">{formatDate(shelter.created_at)}</dd>
			</div>
			{#if shelter.verification_decided_at}
				<div>
					<dt class="font-semibold text-sand-700">{m.admin_shelter_decided()}</dt>
					<dd class="tabular-nums">{formatDate(shelter.verification_decided_at)}</dd>
				</div>
			{/if}
		</dl>
		{#if shelter.archived_at}
			<p class="mt-4 text-sm font-semibold text-sand-700">{m.admin_shelter_archived()}</p>
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
				<p class="text-xs font-semibold tracking-wide text-sand-600 uppercase">
					{m.admin_shelter_owner()}
				</p>
				<div class="mt-3 flex items-center gap-3">
					<Avatar
						name={owner.name}
						hasAvatar={owner.has_avatar && owner.user_id === data.user?.id}
						size="sm"
					/>
					<div>
						<p class="font-semibold text-sand-950">{owner.name}</p>
						<p class="text-sm text-sand-600">{owner.email}</p>
					</div>
				</div>
			</Card>
		</a>
	{:else}
		<Card>
			<p class="text-sm font-semibold text-coral-800">{m.admin_shelter_orphaned()}</p>
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
				const res = await fetch(`/api/admin/shelters/${shelter.id}/owner`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ user_id: value }),
				});
				if (res.ok) location.reload();
			}}
		>
			<input
				name="user_id"
				required
				placeholder={m.admin_shelter_transfer_user()}
				class="h-11 min-w-56 flex-1 rounded-xl border border-sand-300 px-3 focus-ring"
			/>
			<Button type="submit" size="sm">{m.admin_shelter_transfer()}</Button>
		</form>
		<div class="mt-3">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={async () => {
					if (!confirm(m.admin_shelter_archive_confirm())) return;
					const res = await fetch(`/api/admin/shelters/${shelter.id}/archive`, { method: "POST" });
					if (res.ok) location.reload();
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
							hasAvatar={member.has_avatar && member.user_id === data.user?.id}
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
