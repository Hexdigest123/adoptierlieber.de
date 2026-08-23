const FOCUSABLE =
	'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
		(el) => el.tabIndex !== -1 && !el.closest("[inert]"),
	);
}

/** Focus trap + Escape for a mounted dialog panel. Restores focus on destroy. */
export function dialog(node: HTMLElement, onclose: () => void) {
	const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

	queueMicrotask(() => {
		const items = focusables(node);
		(items[0] ?? node).focus();
	});

	function onKey(event: KeyboardEvent) {
		if (event.key === "Escape") {
			event.preventDefault();
			onclose();
			return;
		}
		if (event.key !== "Tab") return;
		const items = focusables(node);
		if (items.length === 0) return;
		const first = items[0];
		const last = items[items.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	node.addEventListener("keydown", onKey);
	if (!node.hasAttribute("tabindex")) node.tabIndex = -1;

	return {
		destroy() {
			node.removeEventListener("keydown", onKey);
			previous?.focus();
		},
	};
}
