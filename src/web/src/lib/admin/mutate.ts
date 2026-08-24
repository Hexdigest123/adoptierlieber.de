import { fail, type ActionFailure } from "@sveltejs/kit";

export type AdminActionFail = {
	adminError: "forbidden" | "generic" | "already";
};

export async function adminMutate(
	fetchFn: typeof fetch,
	path: string,
	method: string,
	body?: unknown,
): Promise<{ ok: true; status: number; json: unknown } | ActionFailure<AdminActionFail>> {
	const response = await fetchFn(path, {
		method,
		headers: body === undefined ? undefined : { "content-type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (response.ok) {
		let json: unknown = {};
		try {
			json = await response.json();
		} catch {
			json = {};
		}
		return { ok: true, status: response.status, json };
	}
	if (response.status === 403) {
		return fail(403, { adminError: "forbidden" as const });
	}
	if (response.status === 409) {
		return fail(409, { adminError: "already" as const });
	}
	if (response.status === 429) {
		return fail(429, { adminError: "generic" as const });
	}
	return fail(response.status === 400 ? 400 : 502, { adminError: "generic" as const });
}
