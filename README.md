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
app/                      CSS + JS dùng chung (common.js, chitieu.js, taisanvang.js, vendor/chart.umd.js)
functions/                Cloudflare Pages Functions: proxy giá SJC (/api/sjc/current, /api/sjc/history)
dev/server.mjs            server chạy thử trên máy
```

## Dữ liệu lưu ở đâu

Số liệu chi tiêu và vàng lưu trong `localStorage` của trình duyệt (khoá `pd.chitieu.v1`, `pd.vang.v1`), không gửi lên server. Mỗi thiết bị có dữ liệu riêng. Dùng nút **Xuất file sao lưu / Nhập từ file** để sao lưu hoặc chuyển máy. Xoá dữ liệu trình duyệt sẽ mất dữ liệu nếu chưa xuất file.

## Giá vàng SJC

Trình duyệt không gọi thẳng SJC được (CORS), nên `functions/api/sjc/*` gọi hộ, có cache 5 phút (giá hiện tại) và 30 phút (lịch sử). Nếu SJC lỗi thì trả lại bản cũ trong cache. Đây là API nội bộ của SJC nên có thể đổi bất cứ lúc nào.

## Triển khai (Cloudflare Pages)

Kết nối repo với Cloudflare Pages, không cần build command, thư mục output là `/` (gốc repo). Cloudflare tự nhận thư mục `functions/`. Trang tĩnh thì host nào cũng chạy được, nhưng giá SJC cần Cloudflare Pages Functions.

## Chạy thử trên máy

```bash
node dev/server.mjs          # gọi SJC thật
node dev/server.mjs --mock   # dùng dev/sample-data.json, chạy offline
# mở http://localhost:3000/chitieu/ và http://localhost:3000/taisanvang/
```

Cần Node 18 trở lên.
