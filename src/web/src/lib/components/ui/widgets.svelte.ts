type WidgetKind = "review" | "support";

/** Lets the account menu open the review/support dialogs mounted in the root layout. */
export const widgetRequest = $state<{ kind: WidgetKind | null }>({ kind: null });

export function openWidget(kind: WidgetKind) {
	widgetRequest.kind = kind;
}
