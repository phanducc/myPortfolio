/* Tiện ích dùng chung cho /chitieu và /taisanvang (JS thuần, gắn vào window.PD) */
(function (g) {
    'use strict';

    var TZ = 'Asia/Ho_Chi_Minh';
    var nf = new Intl.NumberFormat('vi-VN');
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };

    var PD = {};

    /* ---------- Định dạng ---------- */
    PD.vnd = function (n) { return nf.format(Math.round(n)); };
    PD.signed = function (n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + nf.format(Math.round(Math.abs(n))); };
    PD.num = function (n, maxFrac) { return n.toLocaleString('vi-VN', { maximumFractionDigits: maxFrac === undefined ? 2 : maxFrac }); };
    PD.pct = function (p) { return (p > 0 ? '+' : p < 0 ? '−' : '') + Math.abs(p).toFixed(1).replace('.', ',') + '%'; };
    PD.esc = function (s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    };
    /** Thẻ <span> kèm mũi tên + dấu (không dựa vào màu đơn thuần) */
    PD.delta = function (n, suffix) {
        if (n === null || n === undefined || isNaN(n)) return '<span class="flat">—</span>';
        var cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
        var arrow = n > 0 ? '▲' : n < 0 ? '▼' : '■';
        return '<span class="' + cls + '">' + arrow + ' ' + PD.signed(n) + (suffix || '') + '</span>';
    };

    PD.deltaPct = function (p) {
        var cls = p > 0 ? 'up' : p < 0 ? 'down' : 'flat';
        return '<span class="' + cls + '">' + PD.pct(p) + '</span>';
    };

    /** Nhãn tăng/giảm dạng viên thuốc: tăng = nền trắng, giảm = viền; luôn có mũi tên và dấu +/− */
    PD.pill = function (n, suffix) {
        if (n === null || n === undefined || isNaN(n)) return '<span class="pill flat">—</span>';
        var cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
        var arrow = n > 0 ? '▲' : n < 0 ? '▼' : '■';
        return '<span class="pill ' + cls + '">' + arrow + ' ' + PD.signed(n) + (suffix || '') + '</span>';
    };

    /* ---------- Biểu tượng: Material Symbols (Outlined, FILL 1, Weight 700, Grade 200, Optical size 24) ----------
       Tệp SVG nằm ở /assets/icons/<tên>.svg; vẽ bằng CSS mask nên đổi màu theo chữ (currentColor). */
    var ICON_FILES = {
        wallet: 'account_balance_wallet', card: 'credit_card', coins: 'savings', trend: 'trending_up', pie: 'pie_chart',
        up: 'arrow_circle_up', down: 'arrow_circle_down', gold: 'diamond', scale: 'balance', target: 'target', empty: 'inbox',
        chev: 'expand_more', add: 'add', close: 'close', logout: 'logout', login: 'login', edit: 'edit', del: 'delete',
        refresh: 'refresh', download: 'download', upload: 'upload', code: 'code', out: 'arrow_outward', mail: 'mail',
        left: 'chevron_left', right: 'chevron_right'
    };
    /** name: khoá trong ICON_FILES; cls: lớp CSS thêm (tuỳ chọn) */
    PD.icon = function (name, cls) {
        return '<span class="ico mi' + (cls ? ' ' + cls : '') + '" style="--i:url(/assets/icons/' + (ICON_FILES[name] || name) + '.svg)" aria-hidden="true"></span>';
    };
    /** Ô số liệu: biểu tượng + nhãn, số lớn kèm ký hiệu "đ" mờ, dòng phụ.
     *  o: { label, value (html), sub, icon, cls, cur (false = không thêm "đ"), extra (html thêm bên dưới) } */
    PD.tile = function (o) {
        return '<div class="tile' + (o.cls ? ' ' + o.cls : '') + '">' +
            '<div class="lb">' + (o.icon ? '<span class="ic">' + PD.icon(o.icon) + '</span>' : '') + '<span>' + o.label + '</span></div>' +
            '<div class="v">' + o.value + (o.cur === false ? '' : '<span class="cur">đ</span>') + '</div>' +
            (o.sub ? '<div class="u">' + o.sub + '</div>' : '') + (o.extra || '') + '</div>';
    };
    /** Trạng thái trống: biểu tượng + chữ */
    PD.emptyHtml = function (text) { return '<div class="empty"><span class="ic">' + PD.icon('empty') + '</span><span>' + text + '</span></div>'; };
    PD.dow = function (date) { return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(PD.dayMs(date)).getUTCDay()]; };

    /* ---------- Ngày (chuỗi "YYYY-MM-DD", theo giờ Việt Nam) ---------- */
    PD.today = function () {
        var p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        var get = function (t) { return p.filter(function (x) { return x.type === t; })[0].value; };
        return get('year') + '-' + get('month') + '-' + get('day');
    };
    PD.dayMs = function (s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
    PD.msToDay = function (ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
    PD.addDays = function (s, n) { return PD.msToDay(PD.dayMs(s) + n * 86400000); };
    PD.fmtDay = function (s) { var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
    PD.fmtDM = function (ms) { var d = new Date(ms); return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1); };
    PD.isDay = function (s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && PD.msToDay(PD.dayMs(s)) === s; };
    /** Thời điểm thật (ms) -> "dd/MM[/yyyy] [HH:mm]" theo giờ VN */
    PD.fmtStamp = function (t, withTime) {
        var o = { timeZone: TZ, day: '2-digit', month: '2-digit' };
        if (withTime) { o.year = 'numeric'; o.hour = '2-digit'; o.minute = '2-digit'; o.hour12 = false; }
        return new Intl.DateTimeFormat('vi-VN', o).format(new Date(t));
    };

    /* ---------- Ô nhập tiền: tự thêm dấu chấm ngăn cách hàng nghìn ---------- */
    PD.parseMoney = function (s) {
        var d = String(s || '').replace(/\D/g, '');
        return d === '' ? NaN : Number(d);
    };
    PD.moneyInput = function (input, onChange) {
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('autocomplete', 'off');
        input.addEventListener('input', function () {
            var d = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
            input.value = d === '' ? '' : nf.format(Number(d));
            if (onChange) onChange();
        });
    };
    /** "0,5" hoặc "0.5" -> 0.5; sai định dạng -> NaN */
    PD.parseDecimal = function (s) {
        var t = String(s || '').trim().replace(',', '.');
        if (!/^\d*\.?\d+$/.test(t)) return NaN;
        return Number(t);
    };

    /* ---------- Lưu trữ (localStorage của trình duyệt) ---------- */
    PD.load = function (key) {
        try { var v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; }
        catch (e) { return []; }
    };
    PD.save = function (key, arr) {
        try { localStorage.setItem(key, JSON.stringify(arr)); return true; }
        catch (e) { return false; }
    };

    /** Nút Xuất / Nhập file JSON để sao lưu hoặc chuyển dữ liệu.
     *  opt: { filename, validate(item), getAll(): mảng, replaceAll(mảng): Promise } */
    PD.backup = function (root, opt) {
        root.innerHTML =
            '<div class="toolbar"><button type="button" class="btn secondary small" data-a="export">' + PD.icon('download') + 'Xuất file sao lưu</button>' +
            '<button type="button" class="btn secondary small" data-a="import">' + PD.icon('upload') + 'Nhập từ file</button>' +
            '<input type="file" accept="application/json,.json" hidden></div><p class="form-msg" aria-live="polite" style="margin-top:8px"></p>';
        var msg = root.querySelector('.form-msg');
        var file = root.querySelector('input[type=file]');
        var say = function (t, err) { msg.textContent = t; msg.className = 'form-msg' + (err ? ' err' : ''); };
        root.querySelector('[data-a=export]').addEventListener('click', function () {
            var blob = new Blob([JSON.stringify(opt.getAll(), null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = opt.filename;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
            say('Đã xuất file ' + opt.filename);
        });
        root.querySelector('[data-a=import]').addEventListener('click', function () { file.click(); });
        file.addEventListener('change', function () {
            var f = file.files[0];
            if (!f) return;
            var r = new FileReader();
            r.onload = function () {
                var data;
                try {
                    data = JSON.parse(r.result);
                    if (!Array.isArray(data) || !data.every(opt.validate)) throw new Error('bad');
                } catch (e) { file.value = ''; return say('File không hợp lệ.', true); }
                if (!confirm('Thay toàn bộ dữ liệu trên tài khoản bằng ' + data.length + ' dòng trong file?')) { file.value = ''; return; }
                say('Đang nhập…');
                opt.replaceAll(data).then(function () { say('Đã nhập ' + data.length + ' dòng.'); })
                    .catch(function (e) { say('Nhập thất bại: ' + e.message, true); });
                file.value = '';
            };
            r.readAsText(f);
        });
    };

    /** Dữ liệu cũ lưu trong trình duyệt (trước khi có tài khoản): cho phép tải lên tài khoản.
     *  opt: { key, validate, col, toItem(row) -> {id,data}, exists(id) } */
    PD.legacy = function (root, opt) {
        var old = PD.load(opt.key).filter(opt.validate);
        if (!old.length) { root.hidden = true; root.innerHTML = ''; return; }
        root.hidden = false;
        root.innerHTML =
            '<h2 class="panel-title">Có dữ liệu cũ trong trình duyệt này</h2>' +
            '<p class="panel-sub">Tìm thấy ' + old.length + ' dòng lưu trên máy này từ trước khi có tài khoản. Tải lên để dùng trên mọi thiết bị' +
            (opt.exists ? ' (ngày đã có trên tài khoản sẽ được giữ nguyên, không bị ghi đè)' : '') + '.</p>' +
            '<div class="toolbar"><button type="button" class="btn primary small" data-a="up">Tải lên tài khoản</button>' +
            '<button type="button" class="btn secondary small" data-a="drop">Bỏ bản cũ</button></div>' +
            '<p class="form-msg" aria-live="polite" style="margin-top:8px"></p>';
        var msg = root.querySelector('.form-msg');
        var finish = function () {
            try { localStorage.setItem(opt.key + '.migrated', JSON.stringify(old)); localStorage.removeItem(opt.key); } catch (e) { /* bỏ qua */ }
            root.hidden = true;
        };
        root.querySelector('[data-a=up]').addEventListener('click', function () {
            var items = old.map(opt.toItem).filter(function (it) { return !(opt.exists && opt.exists(it.id)); });
            msg.className = 'form-msg'; msg.textContent = 'Đang tải lên…';
            PDCloud.putMany(opt.col, items).then(finish).catch(function (e) {
                msg.className = 'form-msg err'; msg.textContent = 'Tải lên thất bại: ' + e.message;
            });
        });
        root.querySelector('[data-a=drop]').addEventListener('click', function () {
            if (confirm('Bỏ dữ liệu cũ trên máy này? (Bản sao vẫn được giữ lại trong bộ nhớ trình duyệt dưới khoá ' + opt.key + '.migrated)')) finish();
        });
    };

    /** Cổng đăng nhập: chưa đăng nhập thì chỉ hiện khung đăng nhập.
     *  onIn(user) chạy khi đã đăng nhập (và khi đổi tài khoản), onOut() khi đăng xuất. */
    PD.auth = function (onIn, onOut) {
        var content = document.getElementById('content');
        var login = document.getElementById('login');
        var bar = document.getElementById('auth-bar');
        var msg = login.querySelector('.form-msg');
        var btn = login.querySelector('button');
        var say = function (t) { msg.textContent = t || ''; msg.className = 'form-msg' + (t ? ' err' : ''); };
        PD.authFail = function (t) { content.hidden = true; login.hidden = false; say(t); };

        if (!g.PDCloud) {
            content.hidden = true; login.hidden = false;
            btn.disabled = true;
            say('Không tải được Firebase (kiểm tra kết nối mạng rồi tải lại trang).');
            return;
        }
        btn.addEventListener('click', function () {
            say(''); btn.disabled = true;
            PDCloud.signIn().catch(function (e) {
                if (e && e.code === 'auth/popup-blocked') say('Trình duyệt chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.');
                else if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) say('');
                else say('Đăng nhập thất bại: ' + (e && e.message || e));
            }).then(function () { btn.disabled = false; });
        });
        PDCloud.onUser(function (user) {
            document.body.classList.toggle('authed', !!user);        // hiện thanh tab đáy chỉ khi đã đăng nhập
            if (user) {
                login.hidden = true; content.hidden = false;
                var mail = user.email || 'Đã đăng nhập';
                bar.classList.remove('open');
                bar.innerHTML = '<button type="button" class="avatar" aria-label="Tài khoản" aria-haspopup="true" aria-expanded="false">' + PD.esc(mail.charAt(0).toUpperCase()) + '</button>' +
                    '<div class="auth-menu"><span class="who" title="' + PD.esc(mail) + '">' + PD.esc(mail) + '</span>' +
                    '<button type="button" class="btn secondary small" data-a="out">' + PD.icon('logout') + 'Đăng xuất</button></div>';
                bar.querySelector('[data-a=out]').addEventListener('click', function () { PDCloud.signOut(); });
                var av = bar.querySelector('.avatar');
                av.addEventListener('click', function (e) { e.stopPropagation(); var o = bar.classList.toggle('open'); av.setAttribute('aria-expanded', o); });
                onIn(user);
            } else {
                content.hidden = true; login.hidden = false; bar.innerHTML = '';
                onOut();
            }
        });
    };

    /* ---------- Biểu đồ đường (Chart.js) ---------- */
    PD.cssVar = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };

    /**
     * opt.datasets : [{ label, color, data:[{x,y,...}], stepped }]   (x = ms, y = đồng)
     * opt.xMin/xMax/xStep, opt.xFmt(ms) cho nhãn trục
     * opt.tipTitle(x), opt.tipFooter(items) tuỳ chọn
     * opt.points : true = hiện chấm cho mọi điểm (dữ liệu thưa)
     */
    PD.lineChart = function (canvas, opt) {
        var ink2 = PD.cssVar('--ink-2'), grid = PD.cssVar('--grid'), surface = PD.cssVar('--surface');
        var crosshair = {
            id: 'pdCrosshair',
            afterDatasetsDraw: function (c) {
                var a = c.tooltip && c.tooltip.getActiveElements();
                if (!a || !a.length) return;
                var x = a[0].element.x, ctx = c.ctx;
                ctx.save();
                ctx.strokeStyle = ink2; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x, c.chartArea.top); ctx.lineTo(x, c.chartArea.bottom); ctx.stroke();
                ctx.restore();
            }
        };
        var datasets = opt.datasets.map(function (d) {
            return {
                label: d.label, data: d.data,
                borderColor: d.color,
                backgroundColor: d.area ? function (ctx) {
                    var a = ctx.chart.chartArea; if (!a) return 'rgba(255,255,255,0)';
                    var gr = ctx.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
                    gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
                    return gr;
                } : d.color,
                fill: d.area ? 'start' : false,
                borderWidth: 2.5, borderDash: d.dash || [], tension: 0, stepped: d.stepped || false,
                pointRadius: d.pointRadius !== undefined ? d.pointRadius : (opt.points ? 4 : 0), pointHoverRadius: 6,
                pointBackgroundColor: d.color, pointBorderColor: surface, pointBorderWidth: 2,
                pointHoverBorderColor: surface, pointHoverBorderWidth: 2,
                spanGaps: true
            };
        });
        var xTicks = { color: ink2, maxRotation: 0, maxTicksLimit: 8, callback: function (v) { return opt.xFmt(v); } };
        if (opt.xStep) xTicks.stepSize = opt.xStep;
        return new g.Chart(canvas, {
            type: 'line',
            data: { datasets: datasets },
            plugins: [crosshair],
            options: {
                responsive: true, maintainAspectRatio: false, animation: false,
                interaction: { mode: 'index', intersect: false },
                layout: { padding: { right: 12, top: 6 } },
                scales: {
                    x: { type: 'linear', min: opt.xMin, max: opt.xMax, grid: { display: false }, border: { color: grid }, ticks: xTicks },
                    y: {
                        grid: { color: grid }, border: { display: false },
                        ticks: { color: ink2, maxTicksLimit: 6, callback: function (v) { return PD.num(v / 1e6, 2); } },
                        title: { display: true, text: 'triệu đồng', color: ink2, font: { size: 11 } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#000', titleColor: PD.cssVar('--ink'), bodyColor: ink2, footerColor: ink2,
                        borderColor: 'rgba(255,255,255,.6)', borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
                        callbacks: {
                            title: function (items) { return opt.tipTitle(items[0].parsed.x); },
                            label: function (it) { return ' ' + it.dataset.label + ': ' + PD.vnd(it.parsed.y) + ' đ'; },
                            footer: opt.tipFooter ? function (items) { return opt.tipFooter(items); } : undefined
                        }
                    }
                }
            }
        });
    };

    /** Tháng: "2026-11" -> "Tháng 11/2026"; số ngày của tháng */
    PD.monthLabel = function (ym) { var p = ym.split('-'); return 'Tháng ' + (+p[1]) + '/' + p[0]; };
    PD.daysInMonth = function (y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

    /** Màu nền sọc chéo cho cột "chi" (phân biệt với "thu" không chỉ bằng độ sáng) */
    PD.hatch = function (color) {
        var c = document.createElement('canvas'); c.width = c.height = 8;
        var x = c.getContext('2d');
        x.strokeStyle = color; x.lineWidth = 2;
        x.beginPath(); x.moveTo(-2, 10); x.lineTo(10, -2); x.moveTo(-2, 2); x.lineTo(2, -2); x.moveTo(6, 10); x.lineTo(10, 6); x.stroke();
        return x.createPattern(c, 'repeat');
    };

    /**
     * Biểu đồ cột nhóm. opt.labels: nhãn trục x; opt.datasets: [{ label, color, hatch, data:[số đồng] }]
     * opt.tipTitle(i): tiêu đề tooltip theo chỉ số cột
     */
    PD.barChart = function (canvas, opt) {
        var ink2 = PD.cssVar('--ink-2'), grid = PD.cssVar('--grid');
        return new g.Chart(canvas, {
            type: 'bar',
            data: {
                labels: opt.labels,
                datasets: opt.datasets.map(function (d) {
                    return {
                        label: d.label, data: d.data,
                        backgroundColor: d.hatch ? PD.hatch(d.color) : d.color,
                        borderColor: d.color, borderWidth: 1, borderRadius: 3, maxBarThickness: 22
                    };
                })
            },
            options: {
                responsive: true, maintainAspectRatio: false, animation: false,
                interaction: { mode: 'index', intersect: false },
                layout: { padding: { right: 8, top: 6 } },
                scales: {
                    x: { grid: { display: false }, border: { color: grid }, ticks: { color: ink2, maxRotation: 0, autoSkip: true, maxTicksLimit: 16 } },
                    y: {
                        beginAtZero: true, grid: { color: grid }, border: { display: false },
                        ticks: { color: ink2, maxTicksLimit: 6, callback: function (v) { return PD.num(v / 1e6, 2); } },
                        title: { display: true, text: 'triệu đồng', color: ink2, font: { size: 11 } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#000', titleColor: PD.cssVar('--ink'), bodyColor: ink2,
                        borderColor: 'rgba(255,255,255,.6)', borderWidth: 1, padding: 10, boxPadding: 4,
                        callbacks: {
                            title: function (items) { return opt.tipTitle ? opt.tipTitle(items[0].dataIndex) : items[0].label; },
                            label: function (it) { return ' ' + it.dataset.label + ': ' + PD.vnd(it.parsed.y) + ' đ'; }
                        }
                    }
                }
            }
        });
    };

    /** Thanh điều hướng chung */
    PD.isMobile = function () { return g.matchMedia && g.matchMedia('(max-width: 720px)').matches; };

    PD.header = function (active) {
        var el = document.getElementById('app-header');
        if (!el) return;
        var pages = { chitieu: ['/chitieu/', 'Chi tiêu', 'wallet'], taisanvang: ['/taisanvang/', 'Tài sản vàng', 'gold'] };
        var tab = function (key) {
            var p = pages[key];
            return '<a href="' + p[0] + '"' + (active === key ? ' class="active" aria-current="page"' : '') + '>' + PD.icon(p[2]) + '<span>' + p[1] + '</span></a>';
        };
        var btab = function (key) {
            var p = pages[key];
            return '<a class="bn-tab' + (active === key ? ' active' : '') + '" href="' + p[0] + '"' + (active === key ? ' aria-current="page"' : '') + '>' + PD.icon(p[2]) + '<span>' + p[1] + '</span></a>';
        };
        el.className = 'app-header';
        el.innerHTML = '<div class="inner"><a class="brand" href="/" aria-label="Trang chủ"><img src="/assets/logo.webp" alt="" width="400" height="360"><span class="brand-name">PHAN ĐỨC.</span></a>' +
            '<span class="page-name">' + pages[active][1] + '</span>' +
            '<nav class="app-tabs" aria-label="Ứng dụng">' + tab('chitieu') + tab('taisanvang') + '</nav>' +
            '<div id="auth-bar" class="auth-bar"></div></div>';
        // Thanh tab đáy cho điện thoại; nút "+" báo cho trang mở khung nhập
        var nav = document.createElement('nav');
        nav.className = 'bottom-nav'; nav.setAttribute('aria-label', 'Điều hướng');
        nav.innerHTML = btab('chitieu') + '<button type="button" class="nav-add" aria-label="Thêm số liệu">' + PD.icon('add') + '</button>' + btab('taisanvang');
        document.body.appendChild(nav);
        nav.querySelector('.nav-add').addEventListener('click', function () { document.dispatchEvent(new CustomEvent('pd:add')); });
        // Bấm ra ngoài thì đóng menu tài khoản
        document.addEventListener('click', function (e) {
            var bar = document.getElementById('auth-bar');
            if (bar && bar.classList.contains('open') && !bar.contains(e.target)) bar.classList.remove('open');
        });
    };

    /** Đặt độ rộng tối thiểu cho biểu đồ (px). Màn hình hẹp thì khung biểu đồ trượt ngang được và mở sẵn ở phía dữ liệu mới nhất (bên phải). */
    PD.chartWidth = function (box, px) {
        if (!px) { box.style.removeProperty('--cw'); return; }
        box.style.setProperty('--cw', px + 'px');
        var sc = box.parentNode;
        if (sc && sc.classList && sc.classList.contains('chart-scroll')) {
            var go = function () { sc.scrollLeft = sc.scrollWidth; };
            requestAnimationFrame(function () { go(); setTimeout(go, 150); });
        }
    };

    /** Thông báo ngắn ở đáy màn hình (trên thanh tab) */
    var toastTimer = null;
    PD.toast = function (text) {
        var t = document.getElementById('pd-toast');
        if (!t) { t = document.createElement('div'); t.id = 'pd-toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
        t.textContent = text; t.classList.add('show');
        clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
    };

    /** Biến một khung nhập thành khung trượt từ dưới lên trên điện thoại (máy tính: giữ nguyên, open() chỉ cuộn tới khung). */
    PD.sheet = function (sec, focusSel) {
        sec.classList.add('sheet');
        var bg = document.createElement('div'); bg.className = 'sheet-bg'; document.body.appendChild(bg);
        var x = document.createElement('button'); x.type = 'button'; x.className = 'sheet-close'; x.setAttribute('aria-label', 'Đóng'); x.innerHTML = PD.icon('close');
        sec.insertBefore(x, sec.firstChild);
        var isOpen = function () { return sec.classList.contains('open'); };
        function open() {
            if (!PD.isMobile()) { sec.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
            sec.classList.add('open'); bg.classList.add('open'); document.body.classList.add('no-scroll');
            var f = focusSel && sec.querySelector(focusSel);
            if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, 320);
        }
        function close() { sec.classList.remove('open'); bg.classList.remove('open'); document.body.classList.remove('no-scroll'); }
        bg.addEventListener('click', close); x.addEventListener('click', close);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) close(); });
        g.addEventListener('resize', function () { if (isOpen() && !PD.isMobile()) close(); });
        return { open: open, close: close, isOpen: isOpen };
    };

    g.PD = PD;
})(window);
