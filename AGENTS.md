# Ghi chú cho người và AI làm việc trong repo này

Web cá nhân phanduc.eu.org (HTML/CSS/JS thuần) chạy trên Cloudflare Workers + static assets. Xem `README.md` để biết cấu trúc.

## Thêm file hoặc thư mục công khai (quan trọng)

Khi deploy, `scripts/build.mjs` chỉ đưa vào `dist/` những mục liệt kê trong mảng `PUBLIC` ở đầu file. Worker phục vụ `dist/`, nên **thêm file hay thư mục mới ở thư mục gốc mà không thêm vào `PUBLIC` thì file đó không có trên web** (trả 404). Thư mục con của mục đã có (ví dụ file mới trong `assets/` hay `app/`) thì tự được đưa vào.

- Thêm trang mới (ví dụ `/ten-trang/index.html`): thêm `'ten-trang'` vào `PUBLIC`.
- Thêm file lẻ ở gốc (ví dụ `robots.txt`, `favicon.ico`): thêm tên file vào `PUBLIC`.
- Không bao giờ thêm `.git`, `worker.js`, `functions`, `dev`, `scripts`, `firestore.rules`, `README.md` vào `PUBLIC`.
- Thử trước khi đẩy: `npm run build` rồi `DIST=1 node dev/server.mjs --mock`, mở trang mới và kiểm tra.

## Bảo mật

- Header bảo mật và CSP nằm trong `_headers`. Thêm thư viện hay dịch vụ bên ngoài thì phải cập nhật CSP; ưu tiên lưu thư viện vào `app/vendor/` thay vì gọi từ CDN.
- Không đưa số điện thoại, địa chỉ, tuổi, tên trường hay bí mật nào vào repo (repo công khai, lịch sử Git ai cũng đọc được).
- Proxy `/api/sjc/*` chỉ nhận `id` 49 và 188; muốn thêm loại vàng thì sửa `ALLOWED_IDS` trong `functions/_lib/sjc.js`.

## Quy ước

- Trả lời và viết nội dung giao diện bằng tiếng Việt.
- Ảnh dùng định dạng WebP. Biểu tượng là SVG trong `assets/icons/`, vẽ bằng CSS mask (`.mi`).
- Giao diện đen trắng thuần, nền bán trong suốt; giữ nguyên bố cục hiện có.
- Làm xong thì đẩy lên nhánh làm việc và hỏi trước khi tạo PR.
