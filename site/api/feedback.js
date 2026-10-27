// Feedback: anyone can send (POST), only the admin can read (GET). Stored in Neon (DATABASE_URL).
import { neon } from '@neondatabase/serverless';
import { isAdmin } from '../lib/auth.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const KINDS = ['bug', 'idea', 'other'];
const recent = new Map(); // per instance: max 5 messages per IP per 10 minutes

async function db() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS feedback (
    id bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    kind text NOT NULL,
    message text NOT NULL,
    email text,
    page text,
    user_agent text
  )`;
  return sql;
}

export async function POST(request) {
  let b = {};
  try { b = await request.json(); } catch { return json(400, { error: 'Something went wrong.' }); }
  if (b.website) return json(200, { ok: true }); // spam trap filled in: pretend it worked
  const kind = KINDS.includes(b.kind) ? b.kind : 'other';
  const message = String(b.message || '').trim();
  const email = String(b.email || '').trim();
  if (message.length < 3) return json(400, { error: 'Write a few words first.' });
  if (message.length > 5000) return json(400, { error: 'That’s too long. Keep it under 5,000 characters.' });
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return json(400, { error: 'That email looks off.' });

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60e3);
  if (hits.length >= 5) return json(429, { error: 'Slow down a little.' });
  recent.set(ip, [...hits, now]);

  const sql = await db();
  if (!sql) return json(503, { error: 'Feedback isn’t switched on yet.' });
  const page = String(b.page || '').slice(0, 300);
  const ua = (request.headers.get('user-agent') || '').slice(0, 300);
  await sql`INSERT INTO feedback (kind, message, email, page, user_agent) VALUES (${kind}, ${message}, ${email || null}, ${page || null}, ${ua || null})`;
  return json(200, { ok: true });
}

export async function GET(request) {
  if (!(await isAdmin(request))) return json(401, { error: 'Sign in first.' });
  const sql = await db();
  if (!sql) return json(200, { setup: false, items: [] });
  const items = await sql`SELECT id, created_at, kind, message, email, page FROM feedback ORDER BY created_at DESC LIMIT 300`;
  return json(200, { setup: true, items });
}
