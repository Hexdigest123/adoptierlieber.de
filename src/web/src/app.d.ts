import type { SessionUser } from "$lib/types/session";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}
		interface Locals {
			user: SessionUser | null;
		}
		// interface PageData {}
		// interface PageState {}
	}

	interface Env {
		BASIC_AUTH_USER?: string;
		BASIC_AUTH_PASSWORD?: string;
		PUBLIC_API_URL?: string;
	}
}

export {};
