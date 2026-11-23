// Cloudflare Worker: xử lý 2 API giá vàng SJC, mọi đường khác trả về file tĩnh.
// Cấu hình trong wrangler.jsonc ("main" + assets.run_worker_first = ["/api/*"]).
import { onRequestGet as current } from './functions/api/sjc/current.js';
import { onRequestGet as history } from './functions/api/sjc/history.js';

const routes = {
  '/api/sjc/current': current,
  '/api/sjc/history': history,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const handler = routes[url.pathname];
    if (handler) {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
      }
      return handler({ request, waitUntil: (p) => ctx.waitUntil(p) });
    }
    return env.ASSETS.fetch(request);
  },
};
