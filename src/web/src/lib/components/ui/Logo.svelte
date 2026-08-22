<script lang="ts">
	import logoMark from "$lib/assets/logo.svg";

	let { class: className = "" }: { class?: string } = $props();
</script>

<img
	src={logoMark}
	alt=""
	class="block size-9 {className}"
	width="36"
	height="36"
	aria-hidden="true"
/>
