// Lấy giá vàng từ API nội bộ của sjc.com.vn (chạy trên Cloudflare Pages Functions / Workers, cũng chạy được trên Node 18+).
// Lưu ý: đây là API không công khai của SJC, có thể đổi bất cứ lúc nào.

const SJC_URL = 'https://sjc.com.vn/GoldPrice/Services/PriceService.ashx';

export const GOLD_IDS = {
  NHAN_SJC_1_2_5_CHI: 49, // Vàng nhẫn SJC 99,99% 1 chỉ, 2 chỉ, 5 chỉ (Hồ Chí Minh)
  MIEN_TRUNG_SJC_1L: 188, // Vàng SJC 1L, 10L, 1KG — Miền Trung
};

async function callSjc(params) {
  let res;
  try {
    res = await fetch(SJC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://sjc.com.vn',
        Referer: 'https://sjc.com.vn/bieu-do-gia-vang',
        // SJC có thể chặn User-Agent lạ nên dùng UA giống trình duyệt thông thường
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    // Lỗi mạng / hết thời gian chờ: nói rõ để dễ chẩn đoán
    throw new Error(`Không kết nối được SJC (${e.name === 'TimeoutError' ? 'quá 10 giây' : e.message})`);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`SJC trả về HTTP ${res.status}${res.status === 403 ? ' (SJC từ chối request từ máy chủ)' : ''}`);
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`SJC không trả về JSON (${res.headers.get('content-type') || 'không rõ loại'}, ${text.length} ký tự)`);
  }
  if (!json.success) throw new Error('SJC trả về success=false');
  return json;
}

// "/Date(1795224226970)/" -> 1795224226970
const parseNetDate = (s) => Number(String(s).match(/-?\d+/)[0]);

// Date -> "dd/MM/yyyy" theo giờ Việt Nam
function vnDate(d) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(d);
  const get = (t) => p.find((x) => x.type === t).value;
  return `${get('day')}/${get('month')}/${get('year')}`;
}

/** Giá hiện tại (trang "Giá vàng online"). ids: mảng Id cần lấy, bỏ trống = tất cả */
export async function getCurrent(ids) {
  const json = await callSjc({ method: 'GetCurrentGoldPrices' });
  const items = (json.data || [])
    .filter((d) => !ids || ids.length === 0 || ids.includes(d.Id))
    .map((d) => ({
      id: d.Id,
      name: d.TypeName,
      branch: d.BranchName,
      buy: Math.round(d.BuyValue), // VNĐ / lượng
      sell: Math.round(d.SellValue),
    }));
  return { updatedAt: json.latestDate, items };
}

/** Lịch sử giá (trang "Biểu đồ giá vàng") cho 1 loại vàng trong N ngày gần nhất */
export async function getHistory(id, days = 30) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const json = await callSjc({
    method: 'GetGoldPriceHistory',
    goldPriceId: String(id),
    fromDate: vnDate(from),
    toDate: vnDate(to),
  });
  const rows = json.data || [];
  return {
    id,
    name: rows[0]?.TypeName ?? '',
    branch: rows[0]?.BranchName ?? '',
    points: rows
      .map((d) => ({ t: parseNetDate(d.GroupDate), buy: Math.round(d.BuyValue), sell: Math.round(d.SellValue) }))
      .sort((a, b) => a.t - b.t),
  };
}

// ---- Cache ----
// Trên Cloudflare: dùng Cache API (caches.default). Có thêm bản "stale" giữ 7 ngày để trả về khi SJC lỗi.
// Ngoài Cloudflare (chạy thử bằng Node): dùng Map trong bộ nhớ.
const memory = new Map();
const STALE_TTL = 7 * 24 * 3600;

const cfCache = () => (typeof caches !== 'undefined' && caches.default ? caches.default : null);
const cacheKey = (name) => new Request(`https://sjc-cache.internal/${name}`);

async function readCache(name) {
  const c = cfCache();
  if (c) {
    const hit = await c.match(cacheKey(name));
    return hit ? hit.json() : null;
  }
  const m = memory.get(name);
  return m && m.exp > Date.now() ? m.value : null;
}

function writeCache(name, value, ttlSec, ctx) {
  const c = cfCache();
  if (c) {
    const put = c.put(cacheKey(name), new Response(JSON.stringify(value), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttlSec}` },
    }));
    if (ctx && ctx.waitUntil) ctx.waitUntil(put); else return put;
    return;
  }
  memory.set(name, { value, exp: Date.now() + ttlSec * 1000 });
}

/** Trả về dữ liệu còn tươi trong cache, nếu không thì gọi SJC; SJC lỗi thì dùng bản cũ. */
export async function cached(ctx, name, ttlSec, fn) {
  const fresh = await readCache(name);
  if (fresh) return { value: fresh, stale: false };
  try {
    const value = await fn();
    await writeCache(name, value, ttlSec, ctx);
    await writeCache(`${name}:stale`, value, STALE_TTL, ctx);
    return { value, stale: false };
  } catch (err) {
    const old = await readCache(`${name}:stale`);
    if (old) return { value: old, stale: true };
    throw err;
  }
}

export function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', ...extra },
  });
}
