// Portfolio page: live holdings table, return chart, allocation and trade log.
// Data lives in assets/portfolio-data.js. Percentages and per-share prices only.
(function () {
  var H = window.BB_HOLDINGS || [];
  var fmt = window.BB_fmtPct;
  var live = {};
  var sortKey = 'total';
  var names = {};
  H.forEach(function (h) { names[h.ticker] = h.name; });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cls(v) { return v == null ? '' : v >= 0 ? 'up' : 'down'; }
  function rowData(h) {
    var q = live[h.ticker];
    return { h: h, price: q ? q.price : null, today: q ? q.pct : null, total: q ? (q.price / h.avgCost - 1) * 100 : null };
  }

  /* ---------- Holdings table ---------- */
  function renderTable() {
    var data = H.map(rowData);
    data.sort(function (a, b) {
      if (sortKey === 'ticker') return a.h.ticker.localeCompare(b.h.ticker);
      var k = sortKey;
      return (b[k] == null ? -1e9 : b[k]) - (a[k] == null ? -1e9 : a[k]);
    });
    var maxAbs = Math.max.apply(null, data.map(function (d) { return Math.abs(d.total || 0); }).concat([1]));
    var tbody = document.getElementById('pf-body');
    tbody.innerHTML = data.map(function (d, i) {
      var h = d.h;
      var w = d.total == null ? 0 : Math.abs(d.total) / maxAbs * 100;
      var thesis = h.thesis ? '<a class="arrow-link" href="' + h.thesis + '" onclick="event.stopPropagation()">Thesis <span class="arr">→</span></a>' : '<span class="muted">—</span>';
      return '<tr class="pf-row" tabindex="0" aria-expanded="false" data-i="' + i + '">' +
        '<td><span class="pf-tk">' + h.ticker + '</span><span class="pf-name">' + esc(h.name) + '</span></td>' +
        '<td class="pf-type">' + (h.type === 'etf' ? 'ETF' : 'Stock') + '</td>' +
        '<td class="pf-since">' + esc(h.purchased) + '</td>' +
        '<td class="mono">' + (d.price == null ? '—' : '$' + d.price.toFixed(2)) + '</td>' +
        '<td class="mono ' + cls(d.today) + '">' + fmt(d.today) + '</td>' +
        '<td class="pf-total"><span class="mono ' + cls(d.total) + '">' + fmt(d.total) + '</span><span class="pf-bar"><i class="' + cls(d.total) + '" style="width:' + w.toFixed(1) + '%"></i></span></td>' +
        '<td class="pf-link">' + thesis + '</td>' +
      '</tr>' +
      '<tr class="pf-note" hidden><td colspan="7"><p>' + esc(h.note) + '</p></td></tr>';
    }).join('');
    tbody.querySelectorAll('.pf-row').forEach(function (tr) {
      function toggle() {
        var note = tr.nextElementSibling;
        note.hidden = !note.hidden;
        tr.setAttribute('aria-expanded', !note.hidden);
      }
      tr.addEventListener('click', toggle);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  document.querySelectorAll('[data-sort]').forEach(function (b) {
    b.addEventListener('click', function () {
      sortKey = b.getAttribute('data-sort');
      document.querySelectorAll('[data-sort]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      renderTable();
    });
  });

  /* ---------- Summary ---------- */
  function renderSummary() {
    var cost = 0, value = 0, prev = 0, wins = 0, losses = 0, rows = [];
    H.forEach(function (h) {
      var q = live[h.ticker];
      if (!q) return;
      cost += h.shares * h.avgCost; value += h.shares * q.price; prev += h.shares * q.prev;
      var r = (q.price / h.avgCost - 1) * 100;
      rows.push({ t: h.ticker, r: r });
      r >= 0 ? wins++ : losses++;
    });
    if (!cost) {
      document.getElementById('pf-updated').textContent = 'Live prices unavailable right now';
      return;
    }
    rows.sort(function (a, b) { return b.r - a.r; });
    function set(id, text, v) { var el = document.getElementById(id); el.textContent = text; if (v !== undefined) { el.classList.remove('up', 'down'); el.classList.add(cls(v)); } }
    var total = (value / cost - 1) * 100, day = (value / prev - 1) * 100;
    set('pf-total', fmt(total), total);
    set('pf-day', fmt(day), day);
    set('pf-best', rows[0].t + ' ' + fmt(rows[0].r, 1), rows[0].r);
    var w = rows[rows.length - 1];
    set('pf-worst', w.t + ' ' + fmt(w.r, 1), w.r);
    set('pf-wl', wins + ' / ' + losses);
    set('pf-updated', 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' · quotes delayed');

    var chart = document.getElementById('pf-chart');
    var maxAbs = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.r); }).concat([1]));
    chart.innerHTML = rows.map(function (r) {
      var w = Math.abs(r.r) / maxAbs * 50;
      return '<div class="pc-row"><span class="pc-tk">' + r.t + '</span><span class="pc-track"><span class="pc-mid"></span><i class="' + cls(r.r) + '" style="' + (r.r >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w.toFixed(1) + '%"></i></span><span class="pc-val mono ' + cls(r.r) + '">' + fmt(r.r, 1) + '</span></div>';
    }).join('');
  }

  /* ---------- Allocation ---------- */
  function bars(list) {
    return list.map(function (x) {
      return '<div class="al-row"><span>' + esc(x[0]) + '</span><span class="al-track"><i style="width:' + x[1] + '%"></i></span><span class="mono">' + x[1] + '%</span></div>';
    }).join('');
  }
  var A = window.BB_ALLOCATION;
  if (A) {
    document.getElementById('al-type').innerHTML = bars(A.byType);
    document.getElementById('al-sector').innerHTML = bars(A.bySector);
    document.getElementById('al-cash').innerHTML = '<div class="al-row al-cash"><span>Cash</span><span class="al-track"><i style="width:' + A.cash + '%"></i></span><span class="mono">' + A.cash + '%</span></div><p class="al-note">' + esc(A.cashNote) + '</p>';
  }

  /* ---------- Trade log ---------- */
  var log = document.getElementById('pf-log');
  if (log && window.BB_ACTIVITY) {
    log.innerHTML = window.BB_ACTIVITY.map(function (a) {
      var d = new Date(a.date + 'T12:00:00');
      return '<li class="log-row">' +
        '<span class="mono log-date">' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '</span>' +
        '<span class="log-side ' + a.side + '">' + (a.side === 'buy' ? 'Buy' : 'Sell') + '</span>' +
        '<span class="log-tk"><b>' + a.ticker + '</b> ' + esc(names[a.ticker] || '') + '</span>' +
        '<span class="mono log-px">@ $' + a.price.toFixed(2) + '</span>' +
      '</li>';
    }).join('');
    document.getElementById('pf-log-note').textContent = window.BB_ACTIVITY_NOTE || '';
  }

  /* ---------- Load ---------- */
  renderTable();
  Promise.all(H.map(function (h) { return window.BB_quote(h.ticker); })).then(function (qs) {
    qs.forEach(function (q, i) { if (q) live[H[i].ticker] = q; });
    renderTable();
    renderSummary();
  });
})();
