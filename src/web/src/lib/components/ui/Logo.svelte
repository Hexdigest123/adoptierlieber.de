<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import logoMark from "$lib/assets/logo.svg";

	let { class: className = "" }: { class?: string } = $props();
</script>

<span class="inline-flex items-center gap-2 font-bold text-sand-950 {className}">
	<img src={logoMark} alt="" class="size-9" width="36" height="36" aria-hidden="true" />
	<span class="text-xl tracking-tight">{m.brand_name()}</span>
</span>
