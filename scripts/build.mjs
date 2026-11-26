// Đóng gói web để triển khai: copy các file công khai vào dist/ và nén (minify) HTML, CSS, JS.
// Cloudflare chạy lệnh này tự động trước khi deploy (xem "build" trong wrangler.jsonc). Chạy tay: npm run build
// Chỉ những file liệt kê trong PUBLIC mới được đưa vào dist/, nên file server (worker.js, functions/, dev/...) không bao giờ bị lộ.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { minify as minifyHtml } from 'html-minifier-terser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const PUBLIC = ['index.html', 'style.css', '_headers', 'chitieu', 'taisanvang', 'app', 'assets'];
const SKIP_MIN = /(^|[\\/])vendor[\\/]|\.min\.js$/; // thư viện có sẵn bản nén

fs.rmSync(dist, { recursive: true, force: true });

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}

let before = 0, after = 0;
async function emit(src) {
  const rel = path.relative(root, src);
  const out = path.join(dist, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ext = path.extname(src);
  const raw = fs.readFileSync(src);
  let data = raw;
  if (!SKIP_MIN.test(rel)) {
    const text = raw.toString('utf8');
    if (ext === '.js') data = (await transform(text, { loader: 'js', minify: true, legalComments: 'none', target: 'es2020' })).code;
    else if (ext === '.css') data = (await transform(text, { loader: 'css', minify: true, legalComments: 'none' })).code;
    else if (ext === '.html') {
      data = await minifyHtml(text, {
        collapseWhitespace: true, conservativeCollapse: true, removeComments: true,
        minifyCSS: true, minifyJS: true, removeRedundantAttributes: true,
      });
    }
  }
  fs.writeFileSync(out, data);
  before += raw.length; after += Buffer.byteLength(data);
}

for (const item of PUBLIC) {
  const p = path.join(root, item);
  if (!fs.existsSync(p)) throw new Error(`Thiếu ${item}`);
  if (fs.statSync(p).isDirectory()) for (const f of walk(p)) await emit(f); else await emit(p);
}
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`Build xong -> dist/  (${kb(before)} -> ${kb(after)})`);
