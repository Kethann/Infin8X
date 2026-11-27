/**
 * Cloudflare Pages Function: POST /api/contact
 * Forwards the "Send your idea" form via the Resend email API.
 * Required env vars (Pages → Settings → Environment variables, never in code):
 *   RESEND_API_KEY   API key
 *   CONTACT_TO       inbox that receives ideas
 *   CONTACT_FROM     verified sender, e.g. "Infin8X <ideas@yourdomain.com>"
 */
import { check, MIN_FILL_MS, type Field } from '../../src/lib/contactRules';

interface Env { RESEND_API_KEY?: string; CONTACT_TO?: string; CONTACT_FROM?: string }
type Ctx = { request: Request; env: Env };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const onRequestPost = async ({ request, env }: Ctx) => {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return json(503, { error: 'not_configured', fallback: 'mailto' });
  let d: Record<string, string>;
  try { d = await request.json(); } catch { return json(400, { error: 'bad_json' }); }
  // bots: the hidden field filled, or sent faster than a person could fill the form; accept silently, send nothing
  if (d.company || Number(d.elapsed) < MIN_FILL_MS) return json(200, { ok: true });
  // the same rules as the form (src/lib/contactRules.ts): nothing the page would refuse gets through
  const fields: Field[] = ['name', 'email', 'idea', 'budget'];
  if (fields.some((f) => check(f, String(d[f] ?? '')) !== null)) return json(422, { error: 'invalid' });
  const name = String(d.name).trim(), email = String(d.email).trim(), idea = String(d.idea).trim();
  const budget = String(d.budget ?? '').trim(), timeline = String(d.timeline ?? '').slice(0, 40);
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
