// the Bull & the Bear — site behaviour. No dependencies, native scrolling.
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Live quotes (Finnhub, cached per tab for 5 min) ---------- */
  var KEY = window.BB_FINNHUB_KEY;
  var CACHE_MS = 5 * 60 * 1000;
  var inflight = {};

  function cached(sym) {
    try {
      var hit = JSON.parse(sessionStorage.getItem('q:' + sym) || 'null');
      if (hit && Date.now() - hit.t < CACHE_MS) return hit.q;
    } catch (e) {}
    return null;
  }

  function quote(sym) {
    var c = cached(sym);
    if (c) return Promise.resolve(c);
    if (!KEY) return Promise.resolve(null);
    if (inflight[sym]) return inflight[sym];
    inflight[sym] = fetch('https://finnhub.io/api/v1/quote?symbol=' + sym + '&token=' + KEY)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !(d.c > 0)) return null;
        var q = { price: d.c, pct: d.dp, prev: d.pc };
        try { sessionStorage.setItem('q:' + sym, JSON.stringify({ t: Date.now(), q: q })); } catch (e) {}
        return q;
      })
      .catch(function () { return null; });
    return inflight[sym];
  }
  window.BB_quote = quote;

  function fmtPct(v, digits) {
    if (v == null || isNaN(v)) return '—';
    return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(digits == null ? 2 : digits) + '%';
  }
  function tone(el, v) {
    el.classList.remove('up', 'down');
    if (v != null && !isNaN(v)) el.classList.add(v >= 0 ? 'up' : 'down');
  }
  window.BB_fmtPct = fmtPct;

  /* ---------- Ticker tape ---------- */
  var tape = document.querySelector('[data-tape]');
  if (tape) {
    var syms = tape.getAttribute('data-tape').split(',');
    var labels = { SPY: 'S&P 500', QQQ: 'Nasdaq 100', DIA: 'Dow 30', IWM: 'Russell 2000' };
    Promise.all(syms.map(quote)).then(function (qs) {
      var items = syms.map(function (s, i) {
        var q = qs[i];
        if (!q) return '';
        var cls = q.pct >= 0 ? 'up' : 'down';
        return '<span class="tape-item"><b>' + s + '</b>' + (labels[s] ? '<span>' + labels[s] + '</span>' : '') +
          '<span>' + q.price.toFixed(2) + '</span><span class="on-dark ' + cls + '">' + (q.pct >= 0 ? '▲' : '▼') + ' ' + fmtPct(q.pct) + '</span></span>';
      }).join('');
      if (!items) { tape.hidden = true; return; }
      var track = tape.querySelector('.tape-track');
      track.innerHTML = items + items;
      tape.classList.add('ready');
    });
  }

  /* ---------- Live return since publication ---------- */
  document.querySelectorAll('[data-since]').forEach(function (el) {
    var sym = el.getAttribute('data-tk');
    var pub = parseFloat(el.getAttribute('data-since'));
    quote(sym).then(function (q) {
      if (!q) return;
      var v = (q.price / pub - 1) * 100;
      el.textContent = fmtPct(v, 1);
      tone(el, v);
    });
  });
  document.querySelectorAll('[data-price]').forEach(function (el) {
    quote(el.getAttribute('data-price')).then(function (q) {
      if (q) el.textContent = '$' + q.price.toFixed(2);
    });
  });
  document.querySelectorAll('[data-today]').forEach(function (el) {
    quote(el.getAttribute('data-today')).then(function (q) {
      if (!q) return;
      el.textContent = fmtPct(q.pct) + ' today';
      tone(el, q.pct);
    });
  });

  /* ---------- Portfolio total (home page) ---------- */
  var book = document.querySelector('[data-book]');
  if (book && window.BB_HOLDINGS) {
    var hs = window.BB_HOLDINGS;
    Promise.all(hs.map(function (h) { return quote(h.ticker); })).then(function (qs) {
      var cost = 0, value = 0, dayPrev = 0, rows = [];
      hs.forEach(function (h, i) {
        var q = qs[i];
        if (!q) return;
        cost += h.shares * h.avgCost;
        value += h.shares * q.price;
        dayPrev += h.shares * q.prev;
        rows.push({ t: h.ticker, r: (q.price / h.avgCost - 1) * 100 });
      });
      if (!cost) return;
      var total = (value / cost - 1) * 100;
      var day = (value / dayPrev - 1) * 100;
      rows.sort(function (a, b) { return b.r - a.r; });
      var big = book.querySelector('[data-book-total]');
      big.textContent = fmtPct(total);
      tone(big, total);
      var d = book.querySelector('[data-book-day]'); d.textContent = fmtPct(day); tone(d, day);
      var b = book.querySelector('[data-book-best]'); b.textContent = rows[0].t + ' ' + fmtPct(rows[0].r, 1); tone(b, rows[0].r);
      var w = book.querySelector('[data-book-worst]'); var lw = rows[rows.length - 1]; w.textContent = lw.t + ' ' + fmtPct(lw.r, 1); tone(w, lw.r);
    });
  }

  /* ---------- Dateline ---------- */
  document.querySelectorAll('[data-today-date]').forEach(function (el) {
    el.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  });

  /* ---------- Header ---------- */
  var header = document.querySelector('.site-header');
  var hero = document.querySelector('[data-ink-under-header]');
  var progress = document.querySelector('.progress');
  var article = document.querySelector('.prose');
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('scrolled', y > 8);
      if (hero) header.classList.toggle('on-ink', hero.getBoundingClientRect().bottom > 68);
    }
    if (progress && article) {
      var r = article.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (window.innerHeight * 0.35 - r.top) / r.height));
      progress.style.transform = 'scaleX(' + p + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toggle = document.querySelector('.menu-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    var open = document.body.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', open);
  });

  /* ---------- Reveal ---------- */
  document.querySelectorAll('[data-stagger]').forEach(function (parent) {
    var step = parseInt(parent.getAttribute('data-stagger') || '90', 10);
    Array.prototype.forEach.call(parent.querySelectorAll('[data-reveal]'), function (el, i) {
      el.style.setProperty('--d', (i * step) + 'ms');
    });
  });
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
  }
  requestAnimationFrame(function () { requestAnimationFrame(function () { document.body.classList.add('loaded'); }); });

  /* ---------- Archive filters ---------- */
  var filters = document.querySelectorAll('[data-filter]');
  var rowsEls = document.querySelectorAll('.row');
  var count = document.querySelector('.archive-count');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      filters.forEach(function (b) { b.setAttribute('aria-pressed', b === btn); });
      var n = 0;
      rowsEls.forEach(function (r) {
        var show = f === 'all' || r.getAttribute('data-cat') === f;
        r.hidden = !show;
        if (show) n++;
      });
      if (count) count.textContent = n + (n === 1 ? ' piece' : ' pieces');
    });
  });

  /* ---------- Archive hover preview ---------- */
  var peek = document.querySelector('.peek');
  var rowsList = document.querySelector('.rows');
  if (peek && rowsList && window.matchMedia('(hover: hover) and (min-width: 861px)').matches) {
    var x = 0, y = 0, px = 0, py = 0, raf = null;
    function loop() {
      px += (x - px) * (reduce ? 1 : 0.16);
      py += (y - py) * (reduce ? 1 : 0.16);
      peek.style.left = px + 'px';
      peek.style.top = py + 'px';
      raf = Math.abs(x - px) + Math.abs(y - py) > 0.5 ? requestAnimationFrame(loop) : null;
    }
    rowsList.addEventListener('mousemove', function (e) {
      x = e.clientX + 190; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    rowsList.querySelectorAll('.row').forEach(function (row) {
      row.addEventListener('mouseenter', function (e) {
        var src = row.querySelector('.row-thumb');
        if (!src) return;
        peek.innerHTML = src.innerHTML;
        if (!peek.classList.contains('show')) { px = x = e.clientX + 190; py = y = e.clientY; loop(); }
        peek.classList.add('show');
      });
    });
    rowsList.addEventListener('mouseleave', function () { peek.classList.remove('show'); });
  }
})();
