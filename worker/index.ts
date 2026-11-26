/**
 * Cloudflare Worker entry (used by `npx wrangler deploy`).
 * Serves the Vite build in `dist/` as static assets (SPA fallback in wrangler.jsonc)
 * and routes POST /api/contact to the same handler the Pages Function uses.
 */
import { onRequest, onRequestPost } from '../functions/api/contact';

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contact') {
      return request.method === 'POST' ? onRequestPost({ request, env }) : onRequest();
    }
    return env.ASSETS.fetch(request);
  },
};
