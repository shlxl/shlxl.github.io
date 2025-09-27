export const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

export function send(res, code, data) {
  res.writeHead(code, JSON_HEADERS);
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
}

export function notFound(res) {
  send(res, 404, { ok: false, error: 'Not found' });
}

export function unauthorized(res) {
  send(res, 401, { ok: false, error: '未授权或登录已过期' });
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', d => s += d);
    req.on('end', () => {
      try {
        resolve(s ? JSON.parse(s) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}
