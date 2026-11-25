// Server chạy thử trên máy: phục vụ file tĩnh + 2 API /api/sjc/* (dùng đúng code trong functions/).
//   node dev/server.mjs            -> gọi SJC thật
//   node dev/server.mjs --mock     -> dùng dev/sample-data.json thay cho SJC (chạy offline)
// Mặc định cổng 3000 (đổi bằng PORT=...). Khi triển khai thật, Cloudflare Pages tự chạy thư mục functions/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 3000;

if (process.argv.includes('--mock')) {
  const sample = JSON.parse(fs.readFileSync(path.join(root, 'dev/sample-data.json'), 'utf8'));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (!String(url).includes('sjc.com.vn')) return realFetch(url, init);
    const method = new URLSearchParams(init.body).get('method');
    const body = method === 'GetCurrentGoldPrices'
      ? { success: true, latestDate: sample.current.updatedAt, data: sample.current.items.map((i) => ({ Id: i.id, TypeName: i.name, BranchName: i.branch, BuyValue: i.buy, SellValue: i.sell })) }
      : { success: true, data: sample.history.points.map((p) => ({ Id: sample.history.id, TypeName: sample.history.name, BranchName: sample.history.branch, BuyValue: p.buy, SellValue: p.sell, GroupDate: `/Date(${p.t})/` })) };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  console.log('Chế độ --mock: dùng dev/sample-data.json thay cho SJC');
}

const routes = {
  '/api/sjc/current': () => import(pathToFileURL(path.join(root, 'functions/api/sjc/current.js'))),
  '/api/sjc/history': () => import(pathToFileURL(path.join(root, 'functions/api/sjc/history.js'))),
};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (routes[url.pathname]) {
    const mod = await routes[url.pathname]();
    const r = await mod.onRequestGet({ request: new Request(url, { method: 'GET' }), waitUntil() {} });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(await r.text());
  }
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end('Forbidden'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' }); return res.end(); }
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`http://localhost:${port}  (/chitieu/, /taisanvang/)`));
