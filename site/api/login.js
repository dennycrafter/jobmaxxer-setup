import { checkPassword, makeCookie } from '../lib/auth.js';

const fails = new Map(); // per instance, enough to slow down guessing
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

export async function POST(request) {
  if (!process.env.ADMIN_PASSWORD) return json(503, { error: 'Admin access isn’t set up yet.' });
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
  const f = fails.get(ip) || { n: 0, t: 0 };
  if (f.n >= 5 && Date.now() - f.t < 10 * 60e3) return json(429, { error: 'Too many tries. Wait 10 minutes.' });
  let body = {};
  try { body = await request.json(); } catch {}
  if (await checkPassword(body.password)) {
    fails.delete(ip);
    return json(200, { ok: true }, { 'set-cookie': await makeCookie() });
  }
  fails.set(ip, { n: (Date.now() - f.t < 10 * 60e3 ? f.n : 0) + 1, t: Date.now() });
  await new Promise((r) => setTimeout(r, 700));
  return json(401, { error: 'Wrong password.' });
}
