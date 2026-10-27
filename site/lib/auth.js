// Admin sign-in shared by the middleware and the API. Web Crypto only, so it runs in both.
// The cookie holds an expiry time and an HMAC of it, signed with a key made from ADMIN_PASSWORD.
// Changing the password in Vercel signs everyone out.
export const COOKIE = 'jm_admin';
const DAYS = 14;
const enc = new TextEncoder();

async function key() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  const raw = await crypto.subtle.digest('SHA-256', enc.encode('jobmaxxer-admin:' + pw + ':' + (process.env.ADMIN_SECRET || '')));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (s) => new Uint8Array((s.match(/../g) || []).map((h) => parseInt(h, 16)));

export async function checkPassword(given) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || typeof given !== 'string' || !given) return false;
  // Compare hashes so the time taken doesn't depend on how much of the password matched
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(given)), crypto.subtle.digest('SHA-256', enc.encode(pw))]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function makeCookie() {
  const k = await key();
  const exp = String(Date.now() + DAYS * 864e5);
  const sig = hex(await crypto.subtle.sign('HMAC', k, enc.encode(exp)));
  return `${COOKIE}=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export async function isAdmin(request) {
  const k = await key();
  if (!k) return false;
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([0-9]+)\\.([0-9a-f]{64})'));
  if (!m || Number(m[1]) < Date.now()) return false;
  return crypto.subtle.verify('HMAC', k, unhex(m[2]), enc.encode(m[1]));
}
