/* Trang /chitieu — nhật ký tiền mặt + tiền tài khoản theo ngày */
(function () {
    'use strict';

    var COL = 'chitieu';                // Firestore: chitieu/{YYYY-MM-DD} = { date, cash, bank }
    var SV = 'tietkiem';                // Firestore: tietkiem/{YYYY-MM-DD} = { date, value } (số dư tiết kiệm có hiệu lực từ ngày đó)
    var LEGACY_KEY = 'pd.chitieu.v1';   // dữ liệu cũ lưu trong trình duyệt (trước khi có tài khoản)
    var DAYS = 30;
    var $ = function (id) { return document.getElementById(id); };

    PD.header('chitieu');

    var el = {
        form: $('form'), date: $('f-date'), cash: $('f-cash'), bank: $('f-bank'),
        total: $('f-total'), diff: $('f-diff'), submit: $('f-submit'), cancel: $('f-cancel'), msg: $('f-msg'),
        summary: $('summary'), tbody: $('tbody'), chartBox: $('chart-box'),
        tcYear: $('tc-year'), tcMonth: $('tc-month'), tcTiles: $('tc-tiles'), tcBox: $('tc-box'), tcSub: $('tc-sub'),
        chRange: $('ch-range'), chOlder: $('ch-older'), chNewer: $('ch-newer'), chTitle: $('t-chart'),
        svForm: $('sv-form'), svValue: $('sv-value'), svDate: $('sv-date'), svMsg: $('sv-msg'), svNow: $('sv-now'), svSub: $('sv-sub'),
        svHist: $('sv-history'), svBody: $('sv-body')
    };
    var chart = null, tcChart = null;
    var nowYM = PD.today().slice(0, 7);
    var tc = { year: nowYM.slice(0, 4), month: String(+nowYM.slice(5, 7)) };   // thu/chi: năm + tháng ('all' = cả năm)
    var chRange = 'last30';              // biểu đồ đường: 'last30' hoặc 'YYYY-MM'
    var editing = null;                  // ngày đang sửa
    var cache = [];                      // dữ liệu mới nhất từ Firestore
    var svCache = [];                    // các mốc số dư tiết kiệm
    var unwatch = null, unwatchSv = null;

    var valid = function (r) {
        return r && PD.isDay(r.date) && isFinite(r.cash) && isFinite(r.bank) && r.cash >= 0 && r.bank >= 0;
    };
    var rows = function () {
        return cache.filter(valid).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    };
    var toItem = function (r) { return { id: r.date, data: { date: r.date, cash: r.cash, bank: r.bank } }; };
    var saveFail = function (e) { say('Lưu thất bại: ' + (e && e.message || e), true); };

    /* ---------- Tài khoản tiết kiệm: các mốc (từ ngày, số dư), không cần nhập lại mỗi ngày ---------- */
    var svValid = function (s) { return s && PD.isDay(s.date) && isFinite(s.value) && s.value >= 0; };
    var svList = function () { return svCache.filter(svValid).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); };
    /** Số dư tiết kiệm tại một ngày: mốc gần nhất không muộn hơn ngày đó; trước mốc đầu tiên thì lấy luôn giá trị của mốc đầu tiên */
    function savingsAt(date) {
        var l = svList(), v = l.length ? l[0].value : 0;
        for (var i = 0; i < l.length; i++) { if (l[i].date <= date) v = l[i].value; else break; }
        return v;
    }

    /** Thêm tổng (đã gồm tiết kiệm) và chênh lệch so với hôm qua (nếu thiếu hôm qua thì so với ngày gần nhất trước đó) */
    function enrich(list) {
        return list.map(function (r, i) {
            var sav = savingsAt(r.date), total = r.cash + r.bank + sav;
            var prev = i > 0 ? list[i - 1] : null;
            return {
                date: r.date, cash: r.cash, bank: r.bank, sav: sav, total: total,
                diff: prev ? total - (prev.cash + prev.bank + savingsAt(prev.date)) : null,
                prevDate: prev ? prev.date : null,
                gap: prev ? prev.date !== PD.addDays(r.date, -1) : false
            };
        });
    }

    /* ---------- Form ---------- */
    function previewTotal() {
        var cash = PD.parseMoney(el.cash.value), bank = PD.parseMoney(el.bank.value);
        cash = isNaN(cash) ? 0 : cash; bank = isNaN(bank) ? 0 : bank;
        var d = el.date.value, sav = PD.isDay(d) ? savingsAt(d) : 0;
        var total = cash + bank + sav;
        el.total.textContent = PD.vnd(total) + ' đ';
        // Chênh lệch so với ngày liền trước ngày đang chọn
        if (isNaN(PD.parseMoney(el.cash.value)) && isNaN(PD.parseMoney(el.bank.value))) { el.diff.textContent = ''; return; }
        var prev = null;
        rows().forEach(function (r) { if (PD.isDay(d) && r.date < d) prev = r; });
        var note = sav > 0 ? 'Đã gồm tiết kiệm ' + PD.vnd(sav) + ' đ. ' : '';
        if (!prev) { el.diff.textContent = note.trim(); return; }
        var diff = total - (prev.cash + prev.bank + savingsAt(prev.date));
        el.diff.innerHTML = note + 'So với ' + (prev.date === PD.addDays(d, -1) ? 'hôm qua' : PD.fmtDay(prev.date)) + ': ' + PD.delta(diff, ' đ');
    }

    function say(text, err) { el.msg.textContent = text; el.msg.className = 'form-msg' + (err ? ' err' : ''); }

    function resetForm() {
        editing = null;
        el.date.value = PD.today();
        el.cash.value = ''; el.bank.value = '';
        el.submit.textContent = 'Lưu';
        el.cancel.hidden = true;
        previewTotal();
    }

    el.date.max = PD.today();
    PD.moneyInput(el.cash, previewTotal);
    PD.moneyInput(el.bank, previewTotal);
    el.date.addEventListener('change', previewTotal);

    el.form.addEventListener('submit', function (e) {
        e.preventDefault();
        var date = el.date.value;
        var cash = PD.parseMoney(el.cash.value), bank = PD.parseMoney(el.bank.value);
        if (!PD.isDay(date)) return say('Hãy chọn ngày.', true);
        if (date > PD.today()) return say('Không nhập được ngày ở tương lai.', true);
        if (isNaN(cash) && isNaN(bank)) return say('Nhập ít nhất một khoản tiền.', true);
        cash = isNaN(cash) ? 0 : cash; bank = isNaN(bank) ? 0 : bank;

        var existed = rows().some(function (r) { return r.date === date; });
        var row = { date: date, cash: cash, bank: bank };
        PDCloud.put(COL, date, toItem(row).data).catch(saveFail);
        if (editing && editing !== date) PDCloud.remove(COL, editing).catch(saveFail);   // đổi ngày khi sửa
        say((existed || editing ? 'Đã cập nhật ' : 'Đã lưu ') + 'ngày ' + PD.fmtDay(date) + '.');
        resetForm();
    });
    el.cancel.addEventListener('click', function () { resetForm(); say(''); });

    /* ---------- Bảng ---------- */
    el.tbody.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-a]');
        if (!b) return;
        var date = b.getAttribute('data-d');
        if (b.getAttribute('data-a') === 'del') {
            if (!confirm('Xoá số liệu ngày ' + PD.fmtDay(date) + '?')) return;
            PDCloud.remove(COL, date).catch(saveFail);
            if (editing === date) resetForm();
        } else {
            var r = rows().filter(function (x) { return x.date === date; })[0];
            if (!r) return;
            editing = date;
            el.date.value = r.date;
            el.cash.value = PD.vnd(r.cash); el.bank.value = PD.vnd(r.bank);
            el.submit.textContent = 'Cập nhật';
            el.cancel.hidden = false;
            previewTotal();
            say('Đang sửa ngày ' + PD.fmtDay(date) + '.');
            el.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    function renderTable(list) {
        if (!list.length) {
            el.tbody.innerHTML = '<tr><td colspan="7" class="none">Chưa có dữ liệu. Nhập số liệu đầu tiên ở phía trên.</td></tr>';
            return;
        }
        el.tbody.innerHTML = list.slice().reverse().map(function (r) {
            var note = r.gap ? ' <span style="color:var(--ink-3);font-size:12px">(so với ' + PD.fmtDay(r.prevDate).slice(0, 5) + ')</span>' : '';
            return '<tr><td>' + PD.fmtDay(r.date) + '</td><td>' + PD.vnd(r.cash) + '</td><td>' + PD.vnd(r.bank) + '</td><td>' + PD.vnd(r.sav) + '</td>' +
                '<td><b>' + PD.vnd(r.total) + '</b></td><td>' + PD.delta(r.diff) + note + '</td>' +
                '<td class="act"><button type="button" class="link-btn" data-a="edit" data-d="' + r.date + '">Sửa</button>' +
                '<button type="button" class="link-btn del" data-a="del" data-d="' + r.date + '">Xoá</button></td></tr>';
        }).join('');
    }

    /* ---------- Ô tóm tắt ---------- */
    function renderSummary(list) {
        if (!list.length) { el.summary.innerHTML = ''; return; }
        var last = list[list.length - 1];
        var tile = function (label, value, unit, cls) {
            return '<div class="tile' + (cls ? ' ' + cls : '') + '"><div class="lb">' + label + '</div><div class="v">' + value + '</div><div class="u">' + unit + '</div></div>';
        };
        var diffLabel = last.prevDate === null ? 'Chênh lệch' : 'Chênh lệch so với ' + (last.gap ? PD.fmtDay(last.prevDate).slice(0, 5) : 'hôm qua');
        // Hàng trên: tiền mặt · tiền tài khoản · chênh lệch · tiền tiết kiệm. Hàng dưới: một ô rộng cả trang là tổng tài sản
        el.summary.innerHTML =
            tile('Tiền mặt', PD.vnd(last.cash), 'đ') +
            tile('Tiền tài khoản', PD.vnd(last.bank), 'đ') +
            tile(diffLabel, PD.delta(last.diff), last.diff === null ? 'chưa có ngày trước để so sánh' : 'đ') +
            tile('Tiền tiết kiệm', PD.vnd(last.sav), 'đ') +
            tile('Tổng tài sản', PD.vnd(last.total) + ' đ', 'Tiền mặt + tiền tài khoản + tiền tiết kiệm · ngày ' + PD.fmtDay(last.date), 'wide');
    }

    /* ---------- Khung tài khoản tiết kiệm ---------- */
    function renderSavings() {
        var l = svList(), today = PD.today();
        el.svNow.textContent = PD.vnd(savingsAt(today)) + ' đ';
        el.svSub.textContent = l.length ? 'Cập nhật lần cuối: có hiệu lực từ ' + PD.fmtDay(l[l.length - 1].date) : 'Chưa thiết lập. Nhập số dư tiết kiệm hiện có để cộng vào tổng tài sản.';
        el.svHist.hidden = !l.length;
        el.svBody.innerHTML = l.slice().reverse().map(function (s) {
            return '<tr><td>' + PD.fmtDay(s.date) + '</td><td>' + PD.vnd(s.value) + '</td>' +
                '<td class="act"><button type="button" class="link-btn del" data-d="' + s.date + '">Xoá</button></td></tr>';
        }).join('');
    }
    el.svDate.max = PD.today();
    PD.moneyInput(el.svValue);
    el.svForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = PD.parseMoney(el.svValue.value), d = el.svDate.value || PD.today();
        var say2 = function (t, err) { el.svMsg.textContent = t; el.svMsg.className = 'form-msg' + (err ? ' err' : ''); };
        if (isNaN(v)) return say2('Nhập số dư tiết kiệm (có thể là 0).', true);
        if (!PD.isDay(d) || d > PD.today()) return say2('Ngày áp dụng không hợp lệ.', true);
        PDCloud.put(SV, d, { date: d, value: v }).catch(function (err) { say2('Lưu thất bại: ' + (err && err.message || err), true); });
        say2('Đã cập nhật số dư tiết kiệm: ' + PD.vnd(v) + ' đ (từ ' + PD.fmtDay(d) + ').');
        el.svValue.value = ''; el.svDate.value = '';
    });
    el.svBody.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-d]'); if (!b) return;
        var d = b.getAttribute('data-d');
        if (confirm('Xoá mốc số dư tiết kiệm từ ngày ' + PD.fmtDay(d) + '?')) PDCloud.remove(SV, d);
    });

    /* ---------- Tổng thu · tổng chi theo tháng ---------- */
    var fillSelect = function (sel, opts, value) {
        sel.innerHTML = opts.map(function (o) { return '<option value="' + o[0] + '">' + PD.esc(o[1]) + '</option>'; }).join('');
        sel.value = value;
    };
    var emptyBox = function (box, canvas, text) {
        var old = box.querySelector('.chart-empty'); if (old) old.remove();
        canvas.style.display = text ? 'none' : '';
        if (text) { var d = document.createElement('div'); d.className = 'chart-empty'; d.textContent = text; box.appendChild(d); }
    };

    /** Thu = phần tăng, chi = phần giảm của tổng tiền so với lần nhập trước; gộp theo ngày và theo tháng */
    function flows(list) {
        var byDay = {}, byMonth = {};
        list.forEach(function (r) {
            if (r.diff === null) return;                    // lần nhập đầu tiên chưa có gì để so sánh
            var thu = Math.max(r.diff, 0), chi = Math.max(-r.diff, 0), m = r.date.slice(0, 7);
            byDay[r.date] = { thu: thu, chi: chi };
            var o = byMonth[m] = byMonth[m] || { thu: 0, chi: 0 };
            o.thu += thu; o.chi += chi;
        });
        return { byDay: byDay, byMonth: byMonth };
    }

    function renderFlows(list) {
        if (tcChart) { tcChart.destroy(); tcChart = null; }
        // Danh sách năm: các năm có dữ liệu + năm hiện tại
        var years = {}; years[nowYM.slice(0, 4)] = 1;
        list.forEach(function (r) { years[r.date.slice(0, 4)] = 1; });
        var ys = Object.keys(years).sort().reverse();
        if (ys.indexOf(tc.year) < 0) tc.year = ys[0];
        fillSelect(el.tcYear, ys.map(function (y) { return [y, y]; }), tc.year);
        var mopts = [['all', 'Cả năm']]; for (var i = 1; i <= 12; i++) mopts.push([String(i), 'Tháng ' + i]);
        fillSelect(el.tcMonth, mopts, tc.month);

        var f = flows(list), labels = [], thu = [], chi = [], tips = [], T = 0, C = 0;
        if (tc.month === 'all') {
            for (var m = 1; m <= 12; m++) {
                var key = tc.year + '-' + (m < 10 ? '0' : '') + m, o = f.byMonth[key] || { thu: 0, chi: 0 };
                labels.push('T' + m); tips.push('Tháng ' + m + '/' + tc.year); thu.push(o.thu); chi.push(o.chi); T += o.thu; C += o.chi;
            }
            el.tcSub.textContent = 'Năm ' + tc.year + ' · từng tháng trong năm';
        } else {
            var mm = +tc.month, n = PD.daysInMonth(+tc.year, mm);
            for (var d = 1; d <= n; d++) {
                var ds = tc.year + '-' + (mm < 10 ? '0' : '') + mm + '-' + (d < 10 ? '0' : '') + d, o2 = f.byDay[ds] || { thu: 0, chi: 0 };
                labels.push(String(d)); tips.push(PD.fmtDay(ds)); thu.push(o2.thu); chi.push(o2.chi); T += o2.thu; C += o2.chi;
            }
            el.tcSub.textContent = 'Tháng ' + mm + '/' + tc.year + ' · từng ngày trong tháng';
        }
        var net = T - C;
        var tile = function (label, value, unit) { return '<div class="tile"><div class="lb">' + label + '</div><div class="v">' + value + '</div><div class="u">' + unit + '</div></div>'; };
        el.tcTiles.innerHTML =
            tile('Tổng thu', PD.vnd(T), 'đ') + tile('Tổng chi', PD.vnd(C), 'đ') +
            tile('Chênh lệch (thu − chi)', PD.delta(net), 'đ');

        if (T === 0 && C === 0) {
            emptyBox(el.tcBox, $('tc-chart'), 'Chưa có số liệu thu chi trong ' + (tc.month === 'all' ? 'năm ' + tc.year : 'tháng ' + tc.month + '/' + tc.year) + '.');
            return;
        }
        emptyBox(el.tcBox, $('tc-chart'), '');
        tcChart = PD.barChart($('tc-chart'), {
            labels: labels,
            datasets: [{ label: 'Thu', color: PD.cssVar('--s1'), data: thu }, { label: 'Chi', color: PD.cssVar('--s2'), hatch: true, data: chi }],
            tipTitle: function (i) { return tips[i]; }
        });
    }
    el.tcYear.addEventListener('change', function () { tc.year = el.tcYear.value; renderFlows(enrich(rows())); });
    el.tcMonth.addEventListener('change', function () { tc.month = el.tcMonth.value; renderFlows(enrich(rows())); });

    /* ---------- Biểu đồ đường: 30 ngày gần nhất hoặc theo từng tháng ---------- */
    function renderChart(list) {
        if (chart) { chart.destroy(); chart = null; }
        // Các tháng có dữ liệu (mới nhất trước) để chọn
        var months = {}; list.forEach(function (r) { months[r.date.slice(0, 7)] = 1; });
        var ms = Object.keys(months).sort().reverse();
        var order = ['last30'].concat(ms);
        if (order.indexOf(chRange) < 0) chRange = 'last30';
        fillSelect(el.chRange, order.map(function (k) { return [k, k === 'last30' ? '30 ngày gần nhất' : PD.monthLabel(k)]; }), chRange);
        var idx = order.indexOf(chRange);
        el.chOlder.disabled = idx >= order.length - 1; el.chNewer.disabled = idx <= 0;

        var from, to, recent, xStep = 5 * 86400000;
        if (chRange === 'last30') {
            to = PD.today(); from = PD.addDays(to, -(DAYS - 1));
            recent = list.filter(function (r) { return r.date >= from; });
            el.chTitle.textContent = 'Biểu đồ 30 ngày gần nhất';
        } else {
            var y = +chRange.slice(0, 4), m = +chRange.slice(5, 7);
            from = chRange + '-01'; to = chRange + '-' + PD.daysInMonth(y, m);
            recent = list.filter(function (r) { return r.date.slice(0, 7) === chRange; });
            el.chTitle.textContent = 'Biểu đồ ' + PD.monthLabel(chRange);
        }
        var canvas = $('chart');
        if (!recent.length) {
            emptyBox(el.chartBox, canvas, list.length ? 'Chưa có số liệu trong khoảng thời gian này.' : 'Chưa có dữ liệu để vẽ biểu đồ.');
            return;
        }
        emptyBox(el.chartBox, canvas, '');
        var series = function (label, cssName, key, dash) {
            return { label: label, color: PD.cssVar(cssName), dash: dash, data: recent.map(function (r) { return { x: PD.dayMs(r.date), y: r[key] }; }) };
        };
        chart = PD.lineChart(canvas, {
            datasets: [series('Tổng', '--s1', 'total'), series('Tiền mặt', '--s2', 'cash', [8, 5]), series('Tiền tài khoản', '--s3', 'bank', [2, 5])],
            points: true,
            xMin: PD.dayMs(from), xMax: PD.dayMs(to), xStep: xStep,
            xFmt: PD.fmtDM,
            tipTitle: function (x) { return PD.fmtDay(PD.msToDay(x)); }
        });
    }
    el.chRange.addEventListener('change', function () { chRange = el.chRange.value; renderChart(enrich(rows())); });
    // ‹ = tháng cũ hơn, › = tháng mới hơn (danh sách sắp xếp mới nhất trước)
    var stepRange = function (dir) {
        var opts = Array.prototype.map.call(el.chRange.options, function (o) { return o.value; });
        var i = opts.indexOf(chRange) + dir;
        if (i >= 0 && i < opts.length) { chRange = opts[i]; renderChart(enrich(rows())); }
    };
    el.chOlder.addEventListener('click', function () { stepRange(1); });
    el.chNewer.addEventListener('click', function () { stepRange(-1); });

    function render() {
        var list = enrich(rows());
        renderSavings();
        renderSummary(list);
        renderFlows(list);
        renderTable(list);
        renderChart(list);
        previewTotal();
    }

    // File sao lưu: mảng các dòng { date, cash, bank } và (nếu có) các mốc tiết kiệm { date, savings }
    var svFileValid = function (x) { return x && PD.isDay(x.date) && isFinite(x.savings) && x.savings >= 0 && x.cash === undefined; };
    PD.backup($('backup'), {
        filename: 'chitieu-sao-luu.json',
        validate: function (x) { return valid(x) || svFileValid(x); },
        getAll: function () {
            return rows().map(function (r) { return { date: r.date, cash: r.cash, bank: r.bank }; })
                .concat(svList().map(function (s) { return { date: s.date, savings: s.value }; }));
        },
        replaceAll: function (arr) {
            var rs = arr.filter(valid), ss = arr.filter(svFileValid);
            var jobs = [];
            if (rs.length) jobs.push(PDCloud.replaceAll(COL, rs.map(toItem)));
            if (ss.length) jobs.push(PDCloud.replaceAll(SV, ss.map(function (s) { return { id: s.date, data: { date: s.date, value: s.savings } }; })));
            return Promise.all(jobs);
        }
    });

    function offerLegacy() {
        PD.legacy($('legacy'), {
            key: LEGACY_KEY, validate: valid, col: COL, toItem: toItem,
            exists: function (id) { return cache.some(function (r) { return r.date === id; }); }
        });
    }

    PD.auth(function () {
        resetForm();
        if (unwatch) unwatch();
        unwatch = PDCloud.watch(COL, function (docs) {
            cache = docs;
            render();
            offerLegacy();
        }, function (err) {
            PD.authFail(err && err.code === 'permission-denied'
                ? 'Tài khoản này không có quyền truy cập dữ liệu. Hãy đăng nhập bằng đúng tài khoản Google của chủ web.'
                : 'Không đọc được dữ liệu: ' + (err && err.message || err));
        });
        if (unwatchSv) unwatchSv();
        unwatchSv = PDCloud.watch(SV, function (docs) { svCache = docs; render(); previewTotal(); }, function () { /* lỗi quyền đã được báo ở collection chính */ });
    }, function () {
        if (unwatch) { unwatch(); unwatch = null; }
        if (unwatchSv) { unwatchSv(); unwatchSv = null; }
        cache = []; svCache = [];
        if (chart) { chart.destroy(); chart = null; }
        if (tcChart) { tcChart.destroy(); tcChart = null; }
    });
})();
