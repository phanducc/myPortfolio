/* Trang /chitieu — nhật ký tiền mặt + tiền tài khoản theo ngày */
(function () {
    'use strict';

    var COL = 'chitieu';                // Firestore: chitieu/{YYYY-MM-DD} = { date, cash, bank }
    var LEGACY_KEY = 'pd.chitieu.v1';   // dữ liệu cũ lưu trong trình duyệt (trước khi có tài khoản)
    var DAYS = 30;
    var $ = function (id) { return document.getElementById(id); };

    PD.header('chitieu');

    var el = {
        form: $('form'), date: $('f-date'), cash: $('f-cash'), bank: $('f-bank'),
        total: $('f-total'), diff: $('f-diff'), submit: $('f-submit'), cancel: $('f-cancel'), msg: $('f-msg'),
        summary: $('summary'), tbody: $('tbody'), chartBox: $('chart-box')
    };
    var chart = null;
    var editing = null;                  // ngày đang sửa
    var cache = [];                      // dữ liệu mới nhất từ Firestore
    var unwatch = null;

    var valid = function (r) {
        return r && PD.isDay(r.date) && isFinite(r.cash) && isFinite(r.bank) && r.cash >= 0 && r.bank >= 0;
    };
    var rows = function () {
        return cache.filter(valid).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    };
    var toItem = function (r) { return { id: r.date, data: { date: r.date, cash: r.cash, bank: r.bank } }; };
    var saveFail = function (e) { say('Lưu thất bại: ' + (e && e.message || e), true); };

    /** Thêm tổng và chênh lệch so với hôm qua (nếu thiếu hôm qua thì so với ngày gần nhất trước đó) */
    function enrich(list) {
        return list.map(function (r, i) {
            var total = r.cash + r.bank;
            var prev = i > 0 ? list[i - 1] : null;
            return {
                date: r.date, cash: r.cash, bank: r.bank, total: total,
                diff: prev ? total - (prev.cash + prev.bank) : null,
                prevDate: prev ? prev.date : null,
                gap: prev ? prev.date !== PD.addDays(r.date, -1) : false
            };
        });
    }

    /* ---------- Form ---------- */
    function previewTotal() {
        var cash = PD.parseMoney(el.cash.value), bank = PD.parseMoney(el.bank.value);
        cash = isNaN(cash) ? 0 : cash; bank = isNaN(bank) ? 0 : bank;
        var total = cash + bank;
        el.total.textContent = PD.vnd(total) + ' đ';
        // Chênh lệch so với ngày liền trước ngày đang chọn
        if (isNaN(PD.parseMoney(el.cash.value)) && isNaN(PD.parseMoney(el.bank.value))) { el.diff.textContent = ''; return; }
        var d = el.date.value, prev = null;
        rows().forEach(function (r) { if (PD.isDay(d) && r.date < d) prev = r; });
        if (!prev) { el.diff.textContent = ''; return; }
        var diff = total - (prev.cash + prev.bank);
        el.diff.innerHTML = 'So với ' + (prev.date === PD.addDays(d, -1) ? 'hôm qua' : PD.fmtDay(prev.date)) + ': ' + PD.delta(diff, ' đ');
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
            el.tbody.innerHTML = '<tr><td colspan="6" class="none">Chưa có dữ liệu. Nhập số liệu đầu tiên ở phía trên.</td></tr>';
            return;
        }
        el.tbody.innerHTML = list.slice().reverse().map(function (r) {
            var note = r.gap ? ' <span style="color:var(--ink-3);font-size:12px">(so với ' + PD.fmtDay(r.prevDate).slice(0, 5) + ')</span>' : '';
            return '<tr><td>' + PD.fmtDay(r.date) + '</td><td>' + PD.vnd(r.cash) + '</td><td>' + PD.vnd(r.bank) + '</td>' +
                '<td><b>' + PD.vnd(r.total) + '</b></td><td>' + PD.delta(r.diff) + note + '</td>' +
                '<td class="act"><button type="button" class="link-btn" data-a="edit" data-d="' + r.date + '">Sửa</button>' +
                '<button type="button" class="link-btn del" data-a="del" data-d="' + r.date + '">Xoá</button></td></tr>';
        }).join('');
    }

    /* ---------- Ô tóm tắt ---------- */
    function renderSummary(list) {
        if (!list.length) { el.summary.innerHTML = ''; return; }
        var last = list[list.length - 1];
        var tile = function (label, value, unit) {
            return '<div class="tile"><div class="lb">' + label + '</div><div class="v">' + value + '</div><div class="u">' + unit + '</div></div>';
        };
        var diffLabel = last.prevDate === null ? 'Chênh lệch' : 'Chênh lệch so với ' + (last.gap ? PD.fmtDay(last.prevDate).slice(0, 5) : 'hôm qua');
        el.summary.innerHTML =
            tile('Tổng số tiền', PD.vnd(last.total), 'đ · ngày ' + PD.fmtDay(last.date)) +
            tile(diffLabel, PD.delta(last.diff), last.diff === null ? 'chưa có ngày trước để so sánh' : 'đ') +
            tile('Tiền mặt', PD.vnd(last.cash), 'đ') +
            tile('Tiền tài khoản', PD.vnd(last.bank), 'đ');
    }

    /* ---------- Biểu đồ 30 ngày ---------- */
    function renderChart(list) {
        if (chart) { chart.destroy(); chart = null; }
        var today = PD.today(), from = PD.addDays(today, -(DAYS - 1));
        var recent = list.filter(function (r) { return r.date >= from; });
        var old = el.chartBox.querySelector('.chart-empty');
        if (old) old.remove();
        var canvas = $('chart');
        if (!recent.length) {
            canvas.style.display = 'none';
            var d = document.createElement('div');
            d.className = 'chart-empty';
            d.textContent = list.length ? 'Chưa có số liệu trong 30 ngày gần nhất.' : 'Chưa có dữ liệu để vẽ biểu đồ.';
            el.chartBox.appendChild(d);
            return;
        }
        canvas.style.display = '';
        var series = function (label, cssName, key, dash) {
            return { label: label, color: PD.cssVar(cssName), dash: dash, data: recent.map(function (r) { return { x: PD.dayMs(r.date), y: r[key] }; }) };
        };
        chart = PD.lineChart(canvas, {
            datasets: [series('Tổng', '--s1', 'total'), series('Tiền mặt', '--s2', 'cash', [8, 5]), series('Tiền tài khoản', '--s3', 'bank', [2, 5])],
            points: true,
            xMin: PD.dayMs(from), xMax: PD.dayMs(today), xStep: 5 * 86400000,
            xFmt: PD.fmtDM,
            tipTitle: function (x) { return PD.fmtDay(PD.msToDay(x)); }
        });
    }

    function render() {
        var list = enrich(rows());
        renderSummary(list);
        renderTable(list);
        renderChart(list);
        previewTotal();
    }

    PD.backup($('backup'), {
        filename: 'chitieu-sao-luu.json',
        validate: valid,
        getAll: function () { return rows().map(function (r) { return { date: r.date, cash: r.cash, bank: r.bank }; }); },
        replaceAll: function (arr) { return PDCloud.replaceAll(COL, arr.map(toItem)); }
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
    }, function () {
        if (unwatch) { unwatch(); unwatch = null; }
        cache = [];
        if (chart) { chart.destroy(); chart = null; }
    });
})();
