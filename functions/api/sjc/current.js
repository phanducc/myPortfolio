// GET /api/sjc/current?ids=49   (mặc định: vàng nhẫn SJC 1-2-5 chỉ) — cache 5 phút
import { GOLD_IDS, getCurrent, cached, json } from '../../_lib/sjc.js';

export async function onRequestGet({ request, waitUntil }) {
  try {
    const raw = new URL(request.url).searchParams.get('ids') || String(GOLD_IDS.NHAN_SJC_1_2_5_CHI);
    const ids = raw.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0 && n < 1000).slice(0, 20);
    const { value, stale } = await cached({ waitUntil }, 'current', 5 * 60, () => getCurrent());
    return json(
      { updatedAt: value.updatedAt, items: value.items.filter((i) => ids.includes(i.id)) },
      200,
      stale ? { 'X-Stale': '1', 'Cache-Control': 'no-store' } : {},
    );
  } catch (e) {
    return json({ error: e.message }, 502, { 'Cache-Control': 'no-store' });
  }
}
