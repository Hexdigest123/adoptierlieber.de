<script lang="ts">
	import UserIcon from "lucide-svelte/icons/user";

	type Size = "sm" | "md" | "lg";

	type Props = {
		name: string;
		src?: string | null;
		userId?: string | null;
		hasAvatar?: boolean;
		size?: Size;
		alt?: string;
		class?: string;
	};

	let {
		name,
		src = null,
		userId = null,
		hasAvatar = false,
		size = "md",
		alt = "",
		class: className = "",
	}: Props = $props();

	const sizes: Record<Size, string> = {
		sm: "size-9 text-xs",
		md: "size-11 text-sm",
		lg: "size-24 text-2xl",
	};

	const initials = $derived.by(() => {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return "";
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
	});

	const imageSrc = $derived(
		src ??
			(hasAvatar && userId
				? `/api/users/${userId}/avatar`
				: hasAvatar
					? "/api/users/me/avatar"
					: null),
	);

	let broken = $state(false);

	$effect(() => {
		void imageSrc;
		broken = false;
	});
</script>

<span
	class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-coral-100 font-bold text-coral-800 {sizes[
		size
	]} {className}"
	aria-hidden={alt === "" ? "true" : undefined}
>
	{#if imageSrc && !broken}
		<img src={imageSrc} {alt} class="size-full object-cover" onerror={() => (broken = true)} />
	{:else if initials}
		{initials}
	{:else}
		<UserIcon class="size-1/2" />
	{/if}
</span>
