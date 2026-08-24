<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes, HTMLAnchorAttributes } from "svelte/elements";
	import Spinner from "./Spinner.svelte";

	type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
	type Size = "sm" | "md" | "lg";

	type BaseProps = {
		variant?: Variant;
		size?: Size;
		loading?: boolean;
		fullWidth?: boolean;
		disabled?: boolean;
		iconLeft?: Snippet;
		iconRight?: Snippet;
		children: Snippet;
		class?: string;
	};

	type ButtonProps = BaseProps & {
		href?: undefined;
	} & Omit<HTMLButtonAttributes, "class" | "children">;

	type LinkProps = BaseProps & {
		href: string;
	} & Omit<HTMLAnchorAttributes, "class" | "children" | "href">;

	type Props = ButtonProps | LinkProps;

	let {
		variant = "primary",
		size = "md",
		loading = false,
		fullWidth = false,
		disabled = false,
		iconLeft,
		iconRight,
		children,
		class: className = "",
		...rest
	}: Props = $props();

	const base =
		"inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-ring";

	const variants: Record<Variant, string> = {
		primary: "bg-coral-600 text-white hover:bg-coral-700 active:bg-coral-800",
		secondary: "bg-peach-200 text-coral-950 hover:bg-peach-300 active:bg-peach-400",
		outline: "border-2 border-coral-600 text-coral-700 hover:bg-coral-50 active:bg-coral-100",
		ghost: "text-coral-700 hover:bg-coral-50 active:bg-coral-100",
		danger: "bg-sand-950 text-white hover:bg-coral-800 active:bg-coral-900",
	};

	const sizes: Record<Size, string> = {
		sm: "h-10 px-4 text-sm",
		md: "h-11 px-6 text-base",
		lg: "h-13 px-8 text-lg",
	};

	const classes = $derived(
		`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${
			loading ? "pointer-events-none opacity-70" : ""
		} ${className}`,
	);
</script>

{#if rest.href}
	<a class={classes} {...rest as LinkProps}>
		{#if iconLeft}<span class="inline-flex shrink-0" aria-hidden="true">{@render iconLeft()}</span
			>{/if}
		{@render children()}
		{#if iconRight}<span class="inline-flex shrink-0" aria-hidden="true">{@render iconRight()}</span
			>{/if}
	</a>
{:else}
	<button
		class={classes}
		disabled={loading || disabled}
		aria-busy={loading}
		{...rest as ButtonProps}
	>
		{#if loading}
			<Spinner class="size-5" />
		{:else if iconLeft}
			<span class="inline-flex shrink-0" aria-hidden="true">{@render iconLeft()}</span>
		{/if}
		{@render children()}
		{#if !loading && iconRight}
			<span class="inline-flex shrink-0" aria-hidden="true">{@render iconRight()}</span>
		{/if}
	</button>
{/if}
