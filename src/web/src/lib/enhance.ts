import type { SubmitFunction } from "@sveltejs/kit";

/** `use:enhance` handler that keeps typed values after a failed submit but wipes password inputs. */
export const clearPasswordsOnFailure: SubmitFunction = ({ formElement }) => {
	return async ({ result, update }) => {
		await update();
		if (result.type === "failure" || result.type === "error") {
			for (const input of formElement.querySelectorAll<HTMLInputElement>(
				'input[type="password"]',
			)) {
				input.value = "";
				input.dispatchEvent(new Event("input", { bubbles: true }));
			}
		}
	};
};
