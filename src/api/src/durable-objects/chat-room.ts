import { DurableObject } from "cloudflare:workers";
import type { Env } from "../config/env";

type SocketAttach = {
  userId: string;
  threadId: string;
  openedAt: number;
};

// Access is checked once, at upgrade. Cap how long that check stays valid:
// older sockets are closed with CLOSE_REAUTH and the client reconnects through
// sessionValidation + requireThreadAccess again, so logout, suspension or a
// removed membership cut a socket off within this window.
const SOCKET_MAX_AGE_MS = 5 * 60 * 1000;
// A thread has one adopter plus the shelter team; a few tabs each is plenty.
const ROOM_SOCKET_MAX = 50;
const USER_SOCKET_MAX = 5;

export const CLOSE_REAUTH = 4001;
export const CLOSE_FORBIDDEN = 4003;

export class ChatRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const userId = request.headers.get("x-user-id");
    const threadId = request.headers.get("x-thread-id");
    if (!userId || !threadId) {
      return new Response("missing identity", { status: 401 });
    }

    const open = this.liveSockets();
    const mine = open.filter((entry) => entry.meta.userId === userId).length;
    if (open.length >= ROOM_SOCKET_MAX || mine >= USER_SOCKET_MAX) {
      return new Response("too many sockets", { status: 429 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userId, threadId, openedAt: Date.now() } satisfies SocketAttach);

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Send to every fresh socket. With `recipients`, sockets of anyone else
   * (e.g. a staff member removed since connecting) are closed instead.
   */
  async fanout(payload: unknown, recipients?: string[]): Promise<void> {
    const body = JSON.stringify(payload);
    const allowed = recipients ? new Set(recipients) : null;
    for (const { socket, meta } of this.liveSockets()) {
      if (allowed && !allowed.has(meta.userId)) {
        closeQuietly(socket, CLOSE_FORBIDDEN, "forbidden");
        continue;
      }
      try {
        socket.send(body);
      } catch {
        // drop dead sockets
      }
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (expired(ws)) {
      closeQuietly(ws, CLOSE_REAUTH, "reauth");
      return;
    }
    if (typeof message !== "string") return;
    try {
      const parsed = JSON.parse(message) as { type?: string };
      if (parsed.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch {
      // ignore
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    ws.close(code, reason);
  }

  /** Open sockets still inside their max age; expired ones are closed on the way. */
  private liveSockets(): { socket: WebSocket; meta: SocketAttach }[] {
    const out: { socket: WebSocket; meta: SocketAttach }[] = [];
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (expired(socket)) {
        closeQuietly(socket, CLOSE_REAUTH, "reauth");
        continue;
      }
      out.push({ socket, meta: socket.deserializeAttachment() as SocketAttach });
    }
    return out;
  }
}

function expired(socket: WebSocket): boolean {
  const meta = socket.deserializeAttachment() as Partial<SocketAttach> | null;
  // sockets accepted before openedAt existed count as expired
  return !meta?.userId || !meta.openedAt || Date.now() - meta.openedAt > SOCKET_MAX_AGE_MS;
}

function closeQuietly(socket: WebSocket, code: number, reason: string) {
  try {
    socket.close(code, reason);
  } catch {
    // already closing
  }
}

export function chatRoomStub(env: Env, threadId: string) {
  return env.CHAT_ROOM.getByName(threadId);
}
