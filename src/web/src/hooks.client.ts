import type { ClientInit } from "@sveltejs/kit";
import { isMfaSetupRequired, MFA_SETUP_PATH } from "$lib/mfa-setup";

function onSetupPath(): boolean {
	return (
		location.pathname === MFA_SETUP_PATH || location.pathname.startsWith(`${MFA_SETUP_PATH}/`)
	);
}

export const init: ClientInit = () => {
	const original = window.fetch;
	let redirecting = false;
	window.fetch = async (...args) => {
		const response = await original(...args);
		if (!redirecting && !onSetupPath() && (await isMfaSetupRequired(response))) {
			redirecting = true;
			location.assign(MFA_SETUP_PATH);
		}
		return response;
	};
};
