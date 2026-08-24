import { DurableObject } from "cloudflare:workers";
import type { Env } from "../config/env";

type SocketAttach = {
  userId: string;
  threadId: string;
};

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

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userId, threadId } satisfies SocketAttach);

    return new Response(null, { status: 101, webSocket: client });
  }

  async fanout(payload: unknown): Promise<void> {
    const body = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(body);
      } catch {
        // drop dead sockets
      }
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
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
}

export function chatRoomStub(env: Env, threadId: string) {
  return env.CHAT_ROOM.getByName(threadId);
}
