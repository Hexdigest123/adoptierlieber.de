<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import ConfirmDialog from "$lib/components/admin/ConfirmDialog.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { formatDate } from "$lib/admin/format";

	let { data, form }: PageProps = $props();
	let dialog = $state<"approve" | "deny" | null>(null);

	const application = $derived(data.application);
	const owner = $derived(
		application.members.find((member) => member.role === 1) ?? application.members[0],
	);
	const pending = $derived(application.verification_status === "pending");
	const showNotes = $derived(application.verification_status !== "verified");
</script>

<div class="mb-5">
	<a
		href={resolve("/admin/applications")}
		class="text-sm font-semibold text-coral-700 focus-ring hover:text-coral-800"
	>
		{m.admin_applications_title()}
	</a>
	<h1 class="mt-2 text-2xl font-black tracking-tight text-sand-950">{application.org_name}</h1>
</div>

{#if form?.adminError}
	<FormStatus type="error" class="mb-4">{m.admin_error_generic()}</FormStatus>
{/if}

<div class="grid gap-4 lg:grid-cols-3">
	<Card class="lg:col-span-2">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex min-w-0 items-start gap-3">
				{#if application.has_logo}
					<img
						src="/api/shelters/{application.id}/logo"
						alt=""
						class="size-16 shrink-0 rounded-xl border border-sand-200 object-cover"
					/>
				{/if}
				<div class="min-w-0">
					<p class="text-xl font-bold text-sand-950">{application.org_name}</p>
					<p class="text-sm text-sand-700">
						{application.street}, {application.zip}
						{application.city}
					</p>
				</div>
			</div>
			<StatusPill status={application.verification_status} />
		</div>
		<dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_application_website()}</dt>
				<dd>
					{#if application.website}
						<a
							href={application.website}
							class="font-semibold text-coral-700 underline underline-offset-2"
							target="_blank"
							rel="noopener noreferrer">{application.website}</a
						>
					{:else}
						—
					{/if}
				</dd>
			</div>
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_application_registration()}</dt>
				<dd>{application.registration_number ?? "—"}</dd>
			</div>
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_application_submitted()}</dt>
				<dd class="tabular-nums">{formatDate(application.created_at)}</dd>
			</div>
		</dl>
		{#if application.description}
			<h2 class="mt-5 text-sm font-semibold text-sand-700">{m.admin_application_description()}</h2>
			<p class="mt-1 text-sm leading-relaxed text-sand-800">{application.description}</p>
		{/if}
		{#if application.verification_reason}
			<h2 class="mt-5 text-sm font-semibold text-sand-700">{m.admin_deny_reason()}</h2>
			<p class="mt-1 text-sm leading-relaxed text-sand-800">{application.verification_reason}</p>
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
	{/if}
</div>

{#if pending}
	<div
		class="sticky bottom-20 z-20 mt-6 flex flex-wrap gap-2 rounded-2xl border border-sand-200 bg-white p-3 shadow-sm lg:bottom-4"
	>
		<Button type="button" size="sm" onclick={() => (dialog = "approve")}>{m.admin_approve()}</Button
		>
		<Button type="button" variant="danger" size="sm" onclick={() => (dialog = "deny")}
			>{m.admin_deny()}</Button
		>
	</div>
{/if}

{#if showNotes}
	<section class="mt-8" aria-labelledby="admin-notes">
		<h2 id="admin-notes" class="mb-3 text-lg font-bold text-sand-950">{m.admin_notes_title()}</h2>
		<p class="mb-4 text-sm text-sand-600">{m.admin_notes_hint()}</p>
		{#if data.notes.length === 0}
			<p class="mb-4 text-sm text-sand-600">{m.admin_notes_empty()}</p>
		{:else}
			<ol class="mb-5 flex flex-col gap-3">
				{#each data.notes as note (note.id)}
					<li class="rounded-2xl border border-sand-200 bg-white px-4 py-3">
						<p class="text-sm font-semibold text-sand-900">{note.author_name}</p>
						<p class="text-xs text-sand-500 tabular-nums">{formatDate(note.created_at)}</p>
						<p class="mt-2 text-sm whitespace-pre-wrap text-sand-800">{note.body}</p>
					</li>
				{/each}
			</ol>
		{/if}
		<form method="POST" action="?/note" class="flex flex-col gap-3">
			<Textarea id="note-body" name="body" label={m.admin_notes_body()} required rows={3} />
			<Button type="submit" size="sm">{m.admin_notes_add()}</Button>
		</form>
	</section>
{/if}

<ConfirmDialog
	open={dialog === "approve"}
	title={m.admin_approve_confirm_title()}
	text={m.admin_approve_confirm_text()}
	action="?/approve"
	danger={false}
	confirmLabel={m.admin_approve()}
	onclose={() => (dialog = null)}
/>
<ConfirmDialog
	open={dialog === "deny"}
	title={m.admin_deny_confirm_title()}
	text={m.admin_deny_confirm_text()}
	action="?/deny"
	confirmLabel={m.admin_deny()}
	onclose={() => (dialog = null)}
>
	<Textarea id="deny-reason" name="reason" label={m.admin_deny_reason()} required rows={4} />
</ConfirmDialog>
