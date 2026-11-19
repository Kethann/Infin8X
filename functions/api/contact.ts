/**
 * Cloudflare Pages Function: POST /api/contact
 * Forwards the "Send your idea" form via the Resend email API.
 * Required env vars (Pages → Settings → Environment variables, never in code):
 *   RESEND_API_KEY   API key
 *   CONTACT_TO       inbox that receives ideas
 *   CONTACT_FROM     verified sender, e.g. "Infin8X <ideas@yourdomain.com>"
 */
interface Env { RESEND_API_KEY?: string; CONTACT_TO?: string; CONTACT_FROM?: string }
type Ctx = { request: Request; env: Env };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const onRequestPost = async ({ request, env }: Ctx) => {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return json(503, { error: 'not_configured', fallback: 'mailto' });
  let d: Record<string, string>;
  try { d = await request.json(); } catch { return json(400, { error: 'bad_json' }); }
  if (d.company) return json(200, { ok: true }); // honeypot: silently accept bots
  const name = String(d.name ?? '').trim().slice(0, 120);
  const email = String(d.email ?? '').trim().slice(0, 200);
  const idea = String(d.idea ?? '').trim().slice(0, 5000);
  if (!name || !idea || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(422, { error: 'invalid' });
  const budget = String(d.budget ?? '').slice(0, 80), timeline = String(d.timeline ?? '').slice(0, 80);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: email,
      subject: `New idea from ${name}`,
      html: `<h2>New idea</h2><p><b>${esc(name)}</b> &lt;${esc(email)}&gt;</p><p>Budget: ${esc(budget)}<br>Timeline: ${esc(timeline)}</p><pre style="white-space:pre-wrap;font:inherit">${esc(idea)}</pre>`,
    }),
  });
  if (!res.ok) return json(502, { error: 'send_failed', fallback: 'mailto' });
  return json(200, { ok: true });
};

export const onRequest = () => json(405, { error: 'method_not_allowed' });
