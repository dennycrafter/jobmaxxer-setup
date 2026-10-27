import { clearCookie } from '../lib/auth.js';

export function POST() {
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', 'set-cookie': clearCookie(), 'cache-control': 'no-store' } });
}
