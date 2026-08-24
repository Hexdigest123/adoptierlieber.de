export const MFA_SETUP_PATH = "/mfa/setup";
export const MFA_SETUP_REQUIRED = "mfa setup required";

export async function isMfaSetupRequired(response: Response): Promise<boolean> {
	if (response.status !== 403) return false;
	try {
		const body = (await response.clone().json()) as { error?: unknown };
		return body.error === MFA_SETUP_REQUIRED;
	} catch {
		return false;
	}
}
