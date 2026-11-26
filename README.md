# myPortfolio

Web cá nhân (tĩnh) tại phanduc.eu.org, kèm 2 ứng dụng:

| Đường dẫn | Nội dung |
|---|---|
| `/chitieu/` | Nhật ký tiền mặt + tiền tài khoản theo ngày: tổng, chênh lệch so với hôm qua, bảng, biểu đồ 30 ngày |
| `/taisanvang/` | Tài khoản vàng (ngày mua, số chỉ, giá mua), giá vàng nhẫn SJC, biểu đồ SJC Miền Trung 30 ngày, tính lãi lỗ |

## Cấu trúc

```
chitieu/index.html        trang /chitieu
taisanvang/index.html     trang /taisanvang
assets/avatar.webp        ảnh đại diện trang chủ
assets/logo.webp          logo (nhãn dán mèo, nền trong suốt) dùng cho trang, thanh trên và favicon
assets/fonts/             phông Nunito tự lưu (không tải từ Google Fonts)
assets/icons/             biểu tượng Material Symbols dạng SVG (Outlined, FILL 1, Weight 700, Grade 200, Optical size 24), vẽ bằng CSS mask nên đổi màu theo chữ
app/                      CSS + JS dùng chung (common.js, firebase.js, chitieu.js, taisanvang.js, vendor/: Chart.js, GSAP, ScrollTrigger)
_headers                  header bảo mật (CSP, X-Frame-Options, HSTS, ...)
functions/                code proxy giá SJC (/api/sjc/current, /api/sjc/history), được worker.js gọi
scripts/build.mjs         build + nén web vào dist/ khi deploy
worker.js                 Cloudflare Worker: định tuyến /api/sjc/*
firestore.rules          Security Rules tham khảo
dev/server.mjs            server chạy thử trên máy
```

## Dữ liệu lưu ở đâu

Số liệu lưu trên **Firebase Firestore** (project `pd-budgeting`), đăng nhập bằng Google. Dữ liệu đồng bộ giữa các thiết bị và vẫn dùng được khi mất mạng (tự đồng bộ lại sau).

- Collection `chitieu`: mỗi ngày một document `YYYY-MM-DD` gồm `date`, `cash`, `bank`.
- Collection `vang`: mỗi lần mua một document gồm `date`, `chi`, `price` (đ/chỉ).
- Bảo mật nằm ở **Security Rules** (`firestore.rules`): chỉ đúng email Google của chủ web đọc/ghi được. Cấu hình Firebase trong `app/firebase.js` là thông tin công khai theo thiết kế, không phải bí mật.
- Dữ liệu cũ lưu trong trình duyệt (trước khi có tài khoản) được đề nghị tải lên tài khoản ở lần đăng nhập đầu tiên.
- Nút **Xuất file sao lưu / Nhập từ file** dùng để giữ một bản sao JSON ngoài Firebase.

Thiết lập Firebase: bật Authentication (Google), thêm `phanduc.eu.org` vào *Authorized domains*, tạo Firestore và dán `firestore.rules` (đã đổi email).

## Bảo mật

- Không có khoá bí mật trong repo; cấu hình Firebase là công khai theo thiết kế, quyền truy cập do Security Rules quyết định.
- `_headers` đặt CSP và các header bảo mật. CSP chỉ cho phép script từ chính web, `www.gstatic.com` và `apis.google.com` (Firebase). Nếu thêm thư viện hay dịch vụ bên ngoài thì phải thêm vào CSP, tốt nhất là lưu thư viện vào `app/vendor/` thay vì gọi từ CDN.
- Proxy `/api/sjc/*` chỉ nhận `id` 49 và 188; `days` được làm tròn lên 7, 30 hoặc 90.
- Không đưa số điện thoại, địa chỉ hay thông tin cá nhân vào repo: lịch sử Git của repo công khai ai cũng đọc được.

## Giá vàng SJC

Trình duyệt không gọi thẳng SJC được (CORS), nên `functions/api/sjc/*` gọi hộ, có cache 5 phút (giá hiện tại) và 30 phút (lịch sử). Nếu SJC lỗi thì trả lại bản cũ trong cache. Đây là API nội bộ của SJC nên có thể đổi bất cứ lúc nào.

## Triển khai (Cloudflare Workers)

Web chạy trên **Cloudflare Workers + static assets** (cấu hình trong `wrangler.jsonc`). `worker.js` chỉ chạy cho `/api/*`, các đường khác trả file tĩnh trực tiếp. Push lên `main` là Cloudflare tự deploy.

Trước khi deploy, `wrangler.jsonc` chạy `npm run build` (`scripts/build.mjs`): copy các file công khai vào `dist/` và nén HTML, CSS, JS (esbuild + html-minifier-terser). Worker phục vụ thư mục `dist/`. Chỉ các file liệt kê trong `PUBLIC` của script build mới vào `dist/`, nên mã server (`worker.js`, `functions/`, `dev/`) và `.git` không bao giờ bị phục vụ công khai. Khi thêm file hay thư mục công khai mới ở thư mục gốc, nhớ thêm vào `PUBLIC`.

Thử bản đã nén trên máy: `npm install && npm run build && DIST=1 node dev/server.mjs --mock`.

## Chạy thử trên máy

```bash
node dev/server.mjs          # gọi SJC thật
node dev/server.mjs --mock   # dùng dev/sample-data.json, chạy offline
# mở http://localhost:3000/chitieu/ và http://localhost:3000/taisanvang/
```

Cần Node 18 trở lên. Dev server phục vụ file gốc (chưa nén), nên sửa là thấy ngay.
