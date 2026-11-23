// GET /api/sjc/history?id=188&days=30   (mặc định: Miền Trung, 30 ngày) — cache 30 phút
import { GOLD_IDS, getHistory, cached, json } from '../../_lib/sjc.js';

export async function onRequestGet({ request, waitUntil }) {
  try {
    const p = new URL(request.url).searchParams;
    const id = Number(p.get('id')) || GOLD_IDS.MIEN_TRUNG_SJC_1L;
    if (!Number.isInteger(id) || id < 1 || id > 999) return json({ error: 'id không hợp lệ' }, 400, { 'Cache-Control': 'no-store' });
    const days = Math.min(Math.max(Math.round(Number(p.get('days')) || 30), 1), 365);
    const { value, stale } = await cached({ waitUntil }, `history:${id}:${days}`, 30 * 60, () => getHistory(id, days));
    return json(value, 200, stale ? { 'X-Stale': '1', 'Cache-Control': 'no-store' } : {});
  } catch (e) {
    return json({ error: e.message }, 502, { 'Cache-Control': 'no-store' });
  }
}
