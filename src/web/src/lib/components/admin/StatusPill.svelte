<script lang="ts">
	import { m } from "$lib/paraglide/messages";

	type Props = {
		status: string;
		class?: string;
	};

	let { status, class: className = "" }: Props = $props();

	const styles: Record<string, string> = {
		active: "bg-emerald-50 text-emerald-800",
		suspended: "bg-coral-50 text-coral-800",
		pending: "bg-peach-100 text-peach-900",
		verified: "bg-emerald-50 text-emerald-800",
		rejected: "bg-sand-200 text-sand-800",
		draft: "bg-sand-100 text-sand-700",
		live: "bg-emerald-50 text-emerald-800",
		found_home: "bg-peach-100 text-peach-900",
		super_admin: "bg-sand-950 text-white",
		admin: "bg-coral-50 text-coral-800",
	};

	const labels: Record<string, () => string> = {
		active: () => m.admin_status_active(),
		suspended: () => m.admin_status_suspended(),
		pending: () => m.admin_status_pending(),
		verified: () => m.admin_status_verified(),
		rejected: () => m.admin_status_rejected(),
		draft: () => m.admin_status_draft(),
		live: () => m.admin_status_live(),
		found_home: () => m.admin_status_found_home(),
		super_admin: () => m.admin_team_role_super(),
		admin: () => m.admin_team_role_admin(),
	};
</script>

<span
	class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums {styles[
		status
	] ?? 'bg-sand-100 text-sand-700'} {className}"
>
	{labels[status] ? labels[status]() : status}
</span>
