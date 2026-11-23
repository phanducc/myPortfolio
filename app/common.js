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
            '<div class="toolbar"><button type="button" class="btn secondary small" data-a="export">Xuất file sao lưu</button>' +
            '<button type="button" class="btn secondary small" data-a="import">Nhập từ file</button>' +
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
            if (user) {
                login.hidden = true; content.hidden = false;
                bar.innerHTML = '<span class="who" title="' + PD.esc(user.email || '') + '">' + PD.esc(user.email || 'Đã đăng nhập') + '</span>' +
                    '<button type="button" class="btn secondary small">Đăng xuất</button>';
                bar.querySelector('button').addEventListener('click', function () { PDCloud.signOut(); });
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
                borderColor: d.color, backgroundColor: d.color,
                borderWidth: 2, tension: 0, stepped: d.stepped || false,
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
                        backgroundColor: '#1a1216', titleColor: PD.cssVar('--ink'), bodyColor: ink2, footerColor: ink2,
                        borderColor: 'rgba(251,203,223,.3)', borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
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

    /** Thanh điều hướng chung */
    PD.header = function (active) {
        var el = document.getElementById('app-header');
        if (!el) return;
        var tab = function (href, label, key) {
            return '<a href="' + href + '"' + (active === key ? ' class="active" aria-current="page"' : '') + '>' + label + '</a>';
        };
        el.className = 'app-header';
        el.innerHTML = '<div class="inner"><a class="brand" href="/"><img src="/assets/phanduc.png" alt="">PHAN ĐỨC.</a>' +
            '<nav class="app-tabs" aria-label="Ứng dụng">' + tab('/chitieu/', 'Chi tiêu', 'chitieu') + tab('/taisanvang/', 'Tài sản vàng', 'taisanvang') + '</nav>' +
            '<div id="auth-bar" class="auth-bar"></div></div>';
    };

    g.PD = PD;
})(window);
