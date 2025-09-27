import { randomUUID } from 'node:crypto';
import { readBody, send, unauthorized } from './http-utils.mjs';

const RAW_ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || process.env.BLOG_ADMIN_PASSWORD || process.env.ADMIN_PASS || '').trim();
const ADMIN_PASSWORD = RAW_ADMIN_PASSWORD;
const FALLBACK_PASSWORD = ADMIN_PASSWORD ? '' : (process.env.ADMIN_PASSWORD_FALLBACK || 'admin');
const SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL || (12 * 60 * 60 * 1000));

if (!ADMIN_PASSWORD) {
  console.warn('[admin] ADMIN_PASSWORD not set, using fallback password "admin". Set ADMIN_PASSWORD to override.');
}

const SESSIONS = new Map();

function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of SESSIONS) {
    if (!session || session.expiresAt <= now) SESSIONS.delete(token);
  }
}

function verifyPassword(password) {
  const target = ADMIN_PASSWORD || FALLBACK_PASSWORD;
  if (!target) return false;
  return String(password || '').trim() === target;
}

function createSession() {
  cleanupSessions();
  const token = randomUUID();
  const session = { token, expiresAt: Date.now() + SESSION_TTL_MS };
  SESSIONS.set(token, session);
  return session;
}

function tokenFromReq(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || '';
  if (typeof auth === 'string') {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
  }
  return '';
}

function ensureSession(token) {
  if (!token) return null;
  const session = SESSIONS.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    SESSIONS.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

export function ensureAuth(req, res) {
  const token = tokenFromReq(req);
  const session = ensureSession(token);
  if (!session) {
    unauthorized(res);
    return null;
  }
  return session;
}

export async function apiLogin(req, res) {
  try {
    const body = await readBody(req);
    if (!verifyPassword(body.password)) {
      return send(res, 401, { ok: false, error: '密码错误' });
    }
    const session = createSession();
    send(res, 200, { ok: true, token: session.token, ttl: SESSION_TTL_MS });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

export async function apiLogout(req, res) {
  const token = tokenFromReq(req);
  if (token) SESSIONS.delete(token);
  send(res, 200, { ok: true });
}
