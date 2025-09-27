import {
  listPosts,
  newLocalPost,
  promotePost,
  archivePost,
  republishPost,
  removePost,
  updateMeta
} from '../core/posts.mjs';
import {
  listTrashEntries,
  restoreTrashEntry,
  deleteTrashEntry
} from '../core/fs-utils.mjs';
import { readBody, send } from '../lib/http-utils.mjs';

export async function apiList(req, res) {
  try {
    const items = listPosts();
    send(res, 200, { ok: true, items });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

export async function apiNewLocal(req, res) {
  try {
    const body = await readBody(req);
    const result = await newLocalPost(body);
    send(res, 200, { ok: true, ...result });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message, out: e.out, err: e.err });
  }
}

export async function apiPromote(req, res) {
  try {
    const body = await readBody(req);
    const result = await promotePost(body.rel, body.setDate);
    send(res, 200, { ok: true, ...result });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message, out: e.out, err: e.err });
  }
}

export async function apiArchive(req, res) {
  try {
    const body = await readBody(req);
    const result = await archivePost(body.rel);
    send(res, 200, { ok: true, ...result });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message, out: e.out, err: e.err });
  }
}

export async function apiRepublish(req, res) {
  try {
    const body = await readBody(req);
    const result = await republishPost(body.rel);
    send(res, 200, { ok: true, ...result });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

export async function apiRemove(req, res) {
  try {
    const body = await readBody(req);
    const result = await removePost(body.rel, body.hard);
    send(res, 200, { ok: true, ...result });
  } catch (e) {
    const code = e.code === 409 ? 409 : 500;
    send(res, code, { ok: false, error: e.message, checklist: e.checklist });
  }
}

export async function apiUpdateMeta(req, res) {
  try {
    const body = await readBody(req);
    const result = await updateMeta(body.rel, body.patch);
    send(res, 200, { ok: true, ...result });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

export async function apiTrashList(req, res) {
  try {
    const items = listTrashEntries();
    send(res, 200, { ok: true, items });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

export async function apiTrashRestore(req, res) {
  try {
    const body = await readBody(req);
    const restored = restoreTrashEntry(body.name, body.slug);
    send(res, 200, { ok: true, name: body.name, slug: restored.slug, rel: restored.rel });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

export async function apiTrashDelete(req, res) {
  try {
    const body = await readBody(req);
    const ok = deleteTrashEntry(body.name);
    if (!ok) return send(res, 404, { ok: false, error: '目标不存在' });
    send(res, 200, { ok: true });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}
