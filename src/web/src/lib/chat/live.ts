import type { ChatMessage } from "$lib/types/shelter";

type Handlers = {
	onmessage: (row: ChatMessage) => void;
};

// Close codes from the API's ChatRoom: the socket outlived its access check
// (reconnect right away, which re-authorizes) or access is gone (stop).
const CLOSE_REAUTH = 4001;
const CLOSE_FORBIDDEN = 4003;

export function connectThread(threadId: string, handlers: Handlers): () => void {
	const proto = location.protocol === "https:" ? "wss:" : "ws:";
	const url = `${proto}//${location.host}/api/chats/${threadId}/socket`;
	let socket: WebSocket | null = null;
	let closed = false;
	let ping: ReturnType<typeof setInterval> | undefined;
	let retry: ReturnType<typeof setTimeout> | undefined;
	let delay = 1000;

	function open() {
		if (closed) return;
		try {
			socket = new WebSocket(url);
		} catch {
			schedule();
			return;
		}
		socket.addEventListener("open", () => {
			delay = 1000;
			ping = setInterval(() => {
				if (socket?.readyState === WebSocket.OPEN) {
					socket.send(JSON.stringify({ type: "ping" }));
				}
			}, 25000);
		});
		socket.addEventListener("message", (event) => {
			try {
				const payload = JSON.parse(String(event.data)) as {
					type?: string;
					message?: ChatMessage;
				};
				if (payload.type === "message" && payload.message) {
					handlers.onmessage(payload.message);
				}
			} catch {
				// ignore
			}
		});
		socket.addEventListener("close", (event) => {
			clearInterval(ping);
			if (event.code === CLOSE_FORBIDDEN) return;
			if (event.code === CLOSE_REAUTH) {
				clearTimeout(retry);
				retry = setTimeout(open, 250);
				return;
			}
			schedule();
		});
		socket.addEventListener("error", () => {
			socket?.close();
		});
	}

	function schedule() {
		if (closed) return;
		retry = setTimeout(open, delay);
		delay = Math.min(delay * 2, 15000);
	}

	open();

	return () => {
		closed = true;
		clearInterval(ping);
		clearTimeout(retry);
		socket?.close();
	};
}

/**
 * Live updates for one thread: the socket plus an 8 s polling fallback. `shown` returns the
 * rows on screen; unseen rows of this thread go to `onrows` until the returned cleanup runs.
 */
export function followThread(
	threadId: string,
	shown: () => ChatMessage[],
	onrows: (rows: ChatMessage[]) => void,
): () => void {
	let stopped = false;

	function deliver(rows: ChatMessage[]) {
		if (stopped) return;
		const known = new Set(shown().map((row) => row.id));
		const fresh = rows.filter((row) => row.thread_id === threadId && !known.has(row.id));
		if (fresh.length) onrows(fresh);
	}

	const disconnect = connectThread(threadId, { onmessage: (row) => deliver([row]) });
	const timer = setInterval(async () => {
		try {
			const last = shown().at(-1)?.id;
			const qs = last ? `?after=${encodeURIComponent(last)}` : "";
			const response = await fetch(`/api/chats/${threadId}/messages${qs}`);
			if (!response.ok) return;
			const body = (await response.json()) as { items?: ChatMessage[] };
			deliver(body.items ?? []);
		} catch {
			// offline; the next tick retries
		}
	}, 8000);

	return () => {
		stopped = true;
		disconnect();
		clearInterval(timer);
	};
}
