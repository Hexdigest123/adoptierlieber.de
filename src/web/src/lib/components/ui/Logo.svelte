<script lang="ts">
	import logoMark from "$lib/assets/logo.svg";

	/** Size utility (default size-9); replaced rather than appended so it wins reliably. */
	let { class: className = "size-9" }: { class?: string } = $props();
</script>

<img src={logoMark} alt="" class="block {className}" width="36" height="36" aria-hidden="true" />
