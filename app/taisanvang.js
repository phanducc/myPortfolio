/* Trang /taisanvang — tài khoản vàng, giá vàng SJC, lãi lỗ */
(function () {
    'use strict';

    var COL = 'vang';                    // Firestore: vang/{id} = { date, chi, price (đ/chỉ) }
    var LEGACY_KEY = 'pd.vang.v1';       // dữ liệu cũ lưu trong trình duyệt (trước khi có tài khoản)
    var API = '/api/sjc';
    var RING_ID = 49;                    // Vàng nhẫn SJC 99,99% 1 chỉ, 2 chỉ, 5 chỉ
    var HIST_ID = 188;                   // Vàng SJC 1L, 10L, 1KG – Miền Trung
    var DAYS = 30;
    var REFRESH_MS = 10 * 60 * 1000;
    var $ = function (id) { return document.getElementById(id); };
    var r3 = function (n) { return Math.round(n * 1000) / 1000; };

    PD.header('taisanvang');

    var el = {
        form: $('form'), date: $('f-date'), qty: $('f-qty'), price: $('f-price'), unit: $('f-unit'),
        total: $('f-total'), hint: $('f-hint'), submit: $('f-submit'), cancel: $('f-cancel'), msg: $('f-msg')
    };
    var editing = null;
    var histChart = null;
    var cache = [];                      // các lần mua mới nhất từ Firestore
    var unwatch = null, sjcTimer = null;
    var sjc = { ring: null, updatedAt: '', hist: null, error: '' };

    /* ===================== Dữ liệu lần mua ===================== */
    var valid = function (l) {
        return l && typeof l.id === 'string' && PD.isDay(l.date) && isFinite(l.chi) && l.chi > 0 && isFinite(l.price) && l.price > 0;
    };
    var lots = function () {
        return cache.filter(valid).sort(function (a, b) {
            return a.date === b.date ? (a.id < b.id ? -1 : 1) : (a.date < b.date ? -1 : 1);
        });
    };
    var cost = function (l) { return Math.round(l.chi * l.price); };
    var toItem = function (l) { return { id: l.id, data: { date: l.date, chi: l.chi, price: l.price } }; };
    var saveFail = function (e) { say('Lưu thất bại: ' + (e && e.message || e), true); };
    var newId = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

    /* ===================== Form nhập ===================== */
    function say(t, err) { el.msg.textContent = t; el.msg.className = 'form-msg' + (err ? ' err' : ''); }

    /** Giá nhập -> đ/chỉ (NaN nếu chưa nhập) */
    function pricePerChi() {
        var p = PD.parseMoney(el.price.value);
        return el.unit.value === 'luong' ? p / 10 : p;
    }
    function preview() {
        var q = PD.parseDecimal(el.qty.value), p = pricePerChi();
        el.total.textContent = (isNaN(q) || isNaN(p) ? '0' : PD.vnd(q * p)) + ' đ';
        if (isNaN(p)) { el.hint.textContent = ''; return; }
        el.hint.textContent = el.unit.value === 'luong'
            ? '= ' + PD.vnd(p) + ' đ/chỉ'
            : '= ' + PD.vnd(p * 10) + ' đ/lượng';
    }
    function resetForm() {
        editing = null;
        el.date.value = PD.today();
        el.qty.value = ''; el.price.value = '';
        el.submit.textContent = 'Thêm';
        el.cancel.hidden = true;
        preview();
    }

    el.date.max = PD.today();
    PD.moneyInput(el.price, preview);
    el.qty.addEventListener('input', preview);
    el.unit.addEventListener('change', preview);

    el.form.addEventListener('submit', function (e) {
        e.preventDefault();
        var date = el.date.value, q = PD.parseDecimal(el.qty.value), p = pricePerChi();
        if (!PD.isDay(date)) return say('Hãy chọn ngày mua.', true);
        if (date > PD.today()) return say('Không nhập được ngày ở tương lai.', true);
        if (isNaN(q) || q <= 0) return say('Số lượng (chỉ) phải lớn hơn 0.', true);
        if (isNaN(p) || p <= 0) return say('Hãy nhập giá mua.', true);

        var lot = { id: editing || newId(), date: date, chi: r3(q), price: Math.round(p) };
        PDCloud.put(COL, lot.id, toItem(lot).data).catch(saveFail);
        var done = (editing ? 'Đã cập nhật' : 'Đã thêm') + ' lần mua ngày ' + PD.fmtDay(date) + '.';
        say(done);
        resetForm();
        if (PD.isMobile()) { sheet.close(); PD.toast(done); }
    });
    el.cancel.addEventListener('click', function () { resetForm(); say(''); if (PD.isMobile()) sheet.close(); });
    var sheet = PD.sheet($('entry-panel'), '#f-qty');
    document.addEventListener('pd:add', function () { resetForm(); say(''); sheet.open(); });     // nút "+" ở thanh tab đáy

    function onLotAction(e) {
        var b = e.target.closest('button[data-a]');
        if (!b) return;
        var id = b.getAttribute('data-id');
        var lot = lots().filter(function (l) { return l.id === id; })[0];
        if (!lot) return;
        if (b.getAttribute('data-a') === 'del') {
            if (!confirm('Xoá lần mua ngày ' + PD.fmtDay(lot.date) + ' (' + PD.num(lot.chi, 3) + ' chỉ)?')) return;
            PDCloud.remove(COL, id).catch(saveFail);
            if (editing === id) resetForm();
        } else {
            editing = id;
            el.date.value = lot.date;
            el.qty.value = String(lot.chi).replace('.', ',');
            el.unit.value = 'chi';
            el.price.value = PD.vnd(lot.price);
            el.submit.textContent = 'Cập nhật';
            el.cancel.hidden = false;
            preview();
            say('Đang sửa lần mua ngày ' + PD.fmtDay(lot.date) + '.');
            sheet.open();
        }
    }
    $('lots-body').addEventListener('click', onLotAction);
    $('lots-list').addEventListener('click', function (e) {
        var h = e.target.closest('.tx-head');
        if (h) { var o = h.parentNode.classList.toggle('open'); h.setAttribute('aria-expanded', o); return; }
        onLotAction(e);
    });

    /* ===================== Bảng + tóm tắt + biểu đồ vốn ===================== */
    function totals(list) {
        var chi = 0, spent = 0;
        list.forEach(function (l) { chi += l.chi; spent += cost(l); });
        chi = r3(chi);
        return { chi: chi, cost: spent, avg: chi > 0 ? spent / chi : 0 };
    }
    var tile = function (o) { return PD.tile(o); };
    /** 12,5 chỉ -> "1 lượng 2,5 chỉ" */
    function luongChi(chi) {
        var l = Math.floor(chi / 10), c = r3(chi - l * 10);
        if (!l) return '';
        return l + ' lượng' + (c ? ' ' + PD.num(c, 3) + ' chỉ' : '');
    }

    function renderLots() {
        var list = lots(), t = totals(list);
        var body = $('lots-body'), foot = $('lots-foot');
        if (!list.length) {
            body.innerHTML = '<tr><td colspan="5" class="none">' + PD.emptyHtml('Chưa có lần mua nào. Nhập lần mua đầu tiên ở phía trên.') + '</td></tr>';
            $('lots-list').innerHTML = PD.emptyHtml('Chưa có lần mua nào. Chạm nút + để nhập lần mua đầu tiên.');
            foot.innerHTML = '';
            $('summary').innerHTML = '';
        } else {
            body.innerHTML = list.slice().reverse().map(function (l) {
                return '<tr><td>' + PD.fmtDay(l.date) + '</td><td>' + PD.num(l.chi, 3) + '</td><td>' + PD.vnd(l.price) + '</td><td><b>' + PD.vnd(cost(l)) + '</b></td>' +
                    '<td class="act"><button type="button" class="link-btn" data-a="edit" data-id="' + PD.esc(l.id) + '">Sửa</button>' +
                    '<button type="button" class="link-btn del" data-a="del" data-id="' + PD.esc(l.id) + '">Xoá</button></td></tr>';
            }).join('');
            $('lots-list').innerHTML = list.slice().reverse().map(function (l) {
                return '<div class="tx"><button type="button" class="tx-head" aria-expanded="false">' +
                    '<span class="tx-date">' + PD.fmtDay(l.date) + '</span>' +
                    '<span class="tx-total">' + PD.vnd(cost(l)) + '<span class="cur">đ</span></span>' +
                    '<span class="tx-sub"><span>' + PD.num(l.chi, 3) + ' chỉ × ' + PD.vnd(l.price) + ' đ/chỉ</span>' + PD.icon('chev', 'tx-chev') + '</span></button>' +
                    '<div class="tx-detail"><div class="tx-in"><div class="tx-act" style="margin-top:12px"><button type="button" class="btn secondary" data-a="edit" data-id="' + PD.esc(l.id) + '">' + PD.icon('edit') + 'Sửa</button>' +
                    '<button type="button" class="btn secondary" data-a="del" data-id="' + PD.esc(l.id) + '">' + PD.icon('del') + 'Xoá</button></div></div></div></div>';
            }).join('');
            PD.fxFirst($('lots-list'), 'lots-list');
            foot.innerHTML = '<tr><td>Tổng (' + list.length + ' lần)</td><td>' + PD.num(t.chi, 3) + '</td><td>' + PD.vnd(t.avg) + ' <span style="font-weight:400;color:var(--ink-3)">(bình quân)</span></td><td>' + PD.vnd(t.cost) + '</td><td></td></tr>';
            PD.setTiles($('summary'), tile({ label: 'Đang giữ', value: PD.num(t.chi, 3) + ' chỉ', sub: luongChi(t.chi), icon: 'gold', cur: false }) +
                tile({ label: 'Tổng vốn đã bỏ ra', value: PD.vnd(t.cost), icon: 'wallet' }) +
                tile({ label: 'Giá vốn bình quân', value: PD.vnd(t.avg), sub: 'đ/chỉ · ' + PD.vnd(t.avg * 10) + ' đ/lượng', icon: 'target', cur: false }), 'summary');
        }
    }

    /* ===================== Giá SJC ===================== */
    function getJson(url) {
        return fetch(url).then(function (r) {
            if (r.ok) return r.json();
            // Proxy trả { error } khi SJC lỗi: hiển thị lý do thật thay vì chỉ "HTTP 502"
            return r.json().catch(function () { return {}; }).then(function (b) {
                throw new Error(b.error ? b.error + ' [HTTP ' + r.status + ']' : 'HTTP ' + r.status);
            });
        });
    }

    function loadSjc() {
        var btn = $('sjc-reload');
        btn.disabled = true;
        return Promise.all([
            getJson(API + '/current?ids=' + RING_ID),
            getJson(API + '/history?id=' + HIST_ID + '&days=' + DAYS)
        ]).then(function (r) {
            sjc.ring = (r[0].items || [])[0] || null;
            sjc.updatedAt = r[0].updatedAt || '';
            sjc.hist = r[1];
            sjc.error = '';
        }).catch(function (e) {
            sjc.error = e.message;
        }).then(function () {
            btn.disabled = false;
            renderSjc(); renderHist(); renderPL();
        });
    }

    function renderSjc() {
        var err = $('sjc-err');
        err.hidden = !sjc.error;
        err.textContent = sjc.error ? 'Không tải được giá SJC (' + sjc.error + '). Bạn vẫn có thể nhập giá tự nhập ở phần Tính lãi lỗ.' : '';
        var sub = $('sjc-sub'), tiles = $('sjc-tiles');
        if (!sjc.ring) {
            sub.textContent = sjc.error ? 'Chưa có dữ liệu giá' : 'Đang tải giá…';
            tiles.innerHTML = '';
            return;
        }
        sub.textContent = 'Cập nhật lúc ' + sjc.updatedAt + ' · đơn vị: đ/lượng (1 lượng = 10 chỉ)';
        PD.setTiles(tiles, tile({ label: 'Mua vào', value: PD.vnd(sjc.ring.buy), sub: 'đ/lượng · ' + PD.vnd(sjc.ring.buy / 10) + ' đ/chỉ', icon: 'down', cur: false }) +
            tile({ label: 'Bán ra', value: PD.vnd(sjc.ring.sell), sub: 'đ/lượng · ' + PD.vnd(sjc.ring.sell / 10) + ' đ/chỉ', icon: 'up', cur: false }), 'sjc-tiles');
    }

    function renderHist() {
        if (histChart) { histChart.destroy(); histChart = null; }
        var h = sjc.hist, pts = h && h.points || [];
        var box = $('hist-box'), canvas = $('hist-chart');
        var old = box.querySelector('.chart-empty');
        if (old) old.remove();
        $('hist-body').innerHTML = pts.slice().reverse().map(function (p) {
            return '<tr><td>' + PD.fmtStamp(p.t, true) + '</td><td>' + PD.vnd(p.buy) + '</td><td>' + PD.vnd(p.sell) + '</td></tr>';
        }).join('');
        if (!pts.length) {
            canvas.style.display = 'none';
            $('hist-change').textContent = '';
            var d = document.createElement('div');
            d.className = 'chart-empty';
            d.innerHTML = PD.emptyHtml(sjc.error ? 'Không tải được dữ liệu biểu đồ.' : 'Chưa có dữ liệu.');
            box.appendChild(d);
            PD.chartWidth(box, 0);
            return;
        }
        canvas.style.display = '';
        PD.chartWidth(box, DAYS * 26 + 80);        // rộng hơn màn hình, trượt ngang để xem
        var first = pts[0], last = pts[pts.length - 1], dlt = last.sell - first.sell;
        $('hist-change').innerHTML = 'Giá bán ra ' + DAYS + ' ngày qua: <b>' + PD.delta(dlt, ' đ') + ' (' + PD.pct(dlt / first.sell * 100) + ')</b> · từ ' + PD.vnd(first.sell) + ' đến ' + PD.vnd(last.sell) + ' đ/lượng';
        var series = function (label, color, key, dash) {
            return { label: label, color: color, dash: dash, data: pts.map(function (p) { return { x: p.t, y: p[key] }; }) };
        };
        histChart = PD.lineChart(canvas, {
            datasets: [(function () { var s = series('Bán ra', PD.cssVar('--s1'), 'sell'); s.area = true; return s; })(), series('Mua vào', PD.cssVar('--s2'), 'buy', [8, 5])],
            xMin: first.t, xMax: last.t,
            xFmt: function (v) { return PD.fmtStamp(v, false); },
            tipTitle: function (x) { return PD.fmtStamp(x, true); }
        });
    }

    $('hist-toggle').addEventListener('click', function () {
        var table = $('hist-table'), box = $('hist-box');
        var showTable = table.hidden;
        table.hidden = !showTable;
        box.hidden = showTable;
        this.textContent = showTable ? 'Xem biểu đồ' : 'Xem bảng';
        if (!showTable && histChart) histChart.resize();
    });
    $('sjc-reload').addEventListener('click', loadSjc);

    /* ===================== Lãi lỗ ===================== */
    var manual = $('pl-manual');
    PD.moneyInput(manual, function () { renderPL(); });

    function renderPL() {
        var list = lots(), t = totals(list);
        var m = PD.parseMoney(manual.value);
        var buyLuong = !isNaN(m) && m > 0 ? m : (sjc.ring ? sjc.ring.buy : NaN);
        var source = !isNaN(m) && m > 0 ? 'giá tự nhập' : 'giá SJC lúc ' + sjc.updatedAt;
        var body = $('pl-body'), foot = $('pl-foot'), tiles = $('pl-tiles');
        var haveCurrent = !isNaN(buyLuong);
        $('pl-sub').textContent = haveCurrent
            ? 'Theo giá mua vào ' + PD.vnd(buyLuong) + ' đ/lượng (' + source + ')'
            : 'Cần giá hiện tại để tính. Đang chờ giá SJC hoặc hãy nhập giá tự nhập.';

        if (!list.length) {
            tiles.innerHTML = '';
            body.innerHTML = '<tr><td colspan="7" class="none">' + PD.emptyHtml('Chưa có lần mua nào để tính lãi lỗ.') + '</td></tr>';
            $('pl-list').innerHTML = PD.emptyHtml('Chưa có lần mua nào để tính lãi lỗ.');
            foot.innerHTML = '';
            return;
        }
        var buyChi = buyLuong / 10;
        var rowsHtml = list.slice().reverse().map(function (l) {
            var c = cost(l);
            var cells = '<td>' + PD.fmtDay(l.date) + '</td><td>' + PD.num(l.chi, 3) + '</td><td>' + PD.vnd(l.price) + '</td><td>' + PD.vnd(c) + '</td>';
            if (!haveCurrent) return '<tr>' + cells + '<td>—</td><td>—</td><td>—</td></tr>';
            var v = Math.round(l.chi * buyChi), pl = v - c;
            return '<tr>' + cells + '<td>' + PD.vnd(v) + '</td><td>' + PD.pill(pl) + '</td><td>' + PD.deltaPct(pl / c * 100) + '</td></tr>';
        }).join('');
        body.innerHTML = rowsHtml;
        $('pl-list').innerHTML = list.slice().reverse().map(function (l) {
            var c = cost(l), v = haveCurrent ? Math.round(l.chi * buyChi) : NaN, pl = v - c;
            return '<div class="tx static"><div class="tx-head"><span class="tx-date">' + PD.fmtDay(l.date) + '<small>' + PD.num(l.chi, 3) + ' chỉ</small></span>' +
                '<span class="tx-total">' + (haveCurrent ? PD.pill(pl) : '—') + '</span>' +
                '<span class="tx-sub"><span>Vốn ' + PD.vnd(c) + (haveCurrent ? ' → ' + PD.vnd(v) : '') + '</span>' + (haveCurrent ? PD.deltaPct(pl / c * 100) : '') + '</span></div></div>';
        }).join('');

        if (!haveCurrent) { foot.innerHTML = ''; tiles.innerHTML = ''; return; }
        var value = Math.round(t.chi * buyChi), pl = value - t.cost, pct = t.cost ? pl / t.cost * 100 : 0;
        foot.innerHTML = '<tr><td>Tổng</td><td>' + PD.num(t.chi, 3) + '</td><td>' + PD.vnd(t.avg) + '</td><td>' + PD.vnd(t.cost) + '</td><td>' + PD.vnd(value) + '</td><td>' + PD.pill(pl) + '</td><td>' + PD.deltaPct(pct) + '</td></tr>';
        PD.setTiles(tiles, tile({ label: 'Giá trị hiện tại', value: PD.vnd(value), sub: PD.num(t.chi, 3) + ' chỉ × ' + PD.vnd(buyChi) + ' đ/chỉ', icon: 'pie' }) +
            tile({ label: 'Lãi / lỗ', value: PD.delta(pl), sub: PD.pct(pct) + ' so với vốn', icon: 'trend' }) +
            tile({ label: 'Giá hoà vốn', value: PD.vnd(t.avg), sub: 'đ/chỉ · giá mua vào hiện tại ' + PD.vnd(buyChi), icon: 'scale', cur: false }), 'pl-tiles');
    }

    /* ===================== Khởi động ===================== */
    PD.backup($('backup'), {
        filename: 'taisanvang-sao-luu.json',
        validate: valid,
        getAll: function () { return lots(); },
        replaceAll: function (arr) { return PDCloud.replaceAll(COL, arr.map(toItem)); }
    });

    function offerLegacy() {
        PD.legacy($('legacy'), { key: LEGACY_KEY, validate: valid, col: COL, toItem: toItem });
    }

    PD.auth(function () {
        resetForm();
        if (unwatch) unwatch();
        unwatch = PDCloud.watch(COL, function (docs) {
            cache = docs;
            renderLots();
            renderPL();
            offerLegacy();
        }, function (err) {
            PD.authFail(err && err.code === 'permission-denied'
                ? 'Tài khoản này không có quyền truy cập dữ liệu. Hãy đăng nhập bằng đúng tài khoản Google của chủ web.'
                : 'Không đọc được dữ liệu: ' + (err && err.message || err));
        });
        renderSjc(); renderHist(); renderPL();
        loadSjc();
        if (!sjcTimer) sjcTimer = setInterval(loadSjc, REFRESH_MS);
    }, function () {
        if (unwatch) { unwatch(); unwatch = null; }
        cache = [];
        if (sjcTimer) { clearInterval(sjcTimer); sjcTimer = null; }
        if (histChart) { histChart.destroy(); histChart = null; }
    });
})();
