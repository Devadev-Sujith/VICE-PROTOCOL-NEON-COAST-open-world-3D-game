import { DurableObject } from 'cloudflare:workers';

export interface Env {
  ASSETS: Fetcher;
  WORLD: DurableObjectNamespace<NeonCoastWorld>;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

interface WsAttachment {
  playerId: string | null;
  stateJson: string | null;
}

/**
 * Single Global Persistent World Hub powered by Cloudflare Durable Objects + WebSocket Hibernation!
 * Every player worldwide connects to the exact same "neon-coast-global-v1" instance.
 */
export class NeonCoastWorld extends DurableObject<Env> {
  async getOnlineCount(): Promise<number> {
    return this.ctx.getWebSockets().length;
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Hibernatable WebSocket keeps connections alive across eviction with zero idle compute cost!
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null, stateJson: null } satisfies WsAttachment);

    // Immediately replay all currently active players in the single world to the new joiner!
    for (const existing of this.ctx.getWebSockets()) {
      if (existing === server) continue;
      try {
        const att = existing.deserializeAttachment() as WsAttachment | null;
        if (att?.stateJson) {
          server.send(att.stateJson);
        }
      } catch {
        // ignore stale socket
      }
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
    try {
      const pkt = JSON.parse(text) as { t?: string; id?: string };
      if (pkt.t === 'state' && pkt.id) {
        ws.serializeAttachment({ playerId: pkt.id, stateJson: text } satisfies WsAttachment);
      } else if (pkt.t === 'leave' && pkt.id) {
        ws.serializeAttachment({ playerId: null, stateJson: null } satisfies WsAttachment);
      }
    } catch {
      // forward non-state JSON cleanly
    }

    for (const peer of this.ctx.getWebSockets()) {
      if (peer === ws) continue;
      try {
        peer.send(text);
      } catch {
        // ignore closed peer
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.broadcastLeave(ws);
    try {
      if (code >= 1000 && code < 5000 && ![1004, 1005, 1006, 1015].includes(code)) {
        ws.close(code, reason);
      } else {
        ws.close(1000, 'Closed');
      }
    } catch {
      // already closed
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.broadcastLeave(ws);
  }

  private broadcastLeave(ws: WebSocket): void {
    try {
      const att = ws.deserializeAttachment() as WsAttachment | null;
      if (att?.playerId) {
        const leaveMsg = JSON.stringify({ t: 'leave', id: att.playerId });
        for (const peer of this.ctx.getWebSockets()) {
          if (peer === ws) continue;
          try {
            peer.send(leaveMsg);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Single Global World WebSocket Endpoint (/ws)
    if (url.pathname === '/ws') {
      const worldStub = env.WORLD.getByName('neon-coast-global-v1');
      return worldStub.fetch(request);
    }

    // 2. Live Health & Status Endpoint (/api/health)
    if (url.pathname === '/api/health') {
      let players = 0;
      try {
        const worldStub = env.WORLD.getByName('neon-coast-global-v1');
        players = await worldStub.getOnlineCount();
      } catch {
        players = 0;
      }
      return Response.json(
        {
          ok: true,
          ws: true,
          players,
          novaAi: Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 10),
          edge: 'cloudflare-workers',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 3. Secure Server-Side Nova AI Proxy (/api/nova) — API key stays encrypted in Cloudflare Secrets!
    if (url.pathname === '/api/nova' && request.method === 'POST') {
      const apiKey = (env.OPENAI_API_KEY || '').trim();
      if (!apiKey) {
        return Response.json({ error: 'no_api_key' }, { status: 503 });
      }
      try {
        const parsed = (await request.json()) as { model?: string; messages?: unknown[] };
        const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: parsed.model || env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: parsed.messages || [],
            response_format: { type: 'json_object' },
            max_tokens: 180,
            temperature: 0.85,
          }),
        });
        return new Response(upstream.body, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return Response.json({ error: String(err) }, { status: 502 });
      }
    }

    // 4. Static Game Bundle & 3D Assets served globally from Cloudflare Edge
    return env.ASSETS.fetch(request);
  },
};
