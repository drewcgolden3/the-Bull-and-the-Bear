// Email sign-up box. Drop <div data-subscribe></div> anywhere and include this script.
(function () {
  var API = 'https://bullbear-subscribe.vercel.app/api/subscribe';

  var css = '' +
    '.sub-box{max-width:640px;margin:3rem auto;padding:2rem 2rem 1.75rem;background:#fff;border:1px solid var(--rule,#ddd8d0);border-top:3px solid var(--accent,#b8360a);text-align:left}' +
    '.sub-kicker{font-family:var(--sans,system-ui,sans-serif);font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent,#b8360a);margin:0 0 .5rem}' +
    '.sub-title{font-family:var(--serif,Georgia,serif);font-size:1.5rem;font-weight:600;line-height:1.25;margin:0 0 .5rem;color:var(--ink,#141210)}' +
    '.sub-text{font-size:.95rem;line-height:1.6;color:var(--muted,#6b6560);margin:0 0 1.25rem}' +
    '.sub-form{display:flex;gap:.5rem;flex-wrap:wrap}' +
    '.sub-form input[type=email]{flex:1 1 220px;min-width:0;font:inherit;font-size:1rem;padding:.8rem 1rem;border:1px solid var(--rule,#ddd8d0);background:var(--cream,#f7f4ef);color:var(--ink,#141210);border-radius:0}' +
    '.sub-form input[type=email]:focus{outline:2px solid var(--accent,#b8360a);outline-offset:-1px}' +
    '.sub-form button{font:inherit;font-size:.85rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:.8rem 1.4rem;background:var(--ink,#141210);color:#fff;border:0;cursor:pointer;transition:background .2s}' +
    '.sub-form button:hover{background:var(--accent,#b8360a)}' +
    '.sub-form button:disabled{opacity:.6;cursor:default}' +
    '.sub-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.sub-msg{font-size:.9rem;margin:.85rem 0 0;min-height:1.2em;color:var(--muted,#6b6560)}' +
    '.sub-msg.ok{color:#2e7d32}.sub-msg.err{color:var(--accent,#b8360a)}' +
    '.sub-banner{position:fixed;left:50%;bottom:1.5rem;transform:translateX(-50%);z-index:999;max-width:calc(100% - 2rem);background:var(--ink,#141210);color:#fff;padding:.9rem 1.25rem;font-size:.92rem;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer}' +
    '.sub-dark .sub-box{background:rgba(255,255,255,.035);border-color:rgba(255,255,255,.1);border-top-color:var(--accent,#c9a84c)}' +
    '.sub-dark .sub-title{color:var(--text,#e8e2d9)}' +
    '.sub-dark .sub-text,.sub-dark .sub-msg{color:var(--muted,#888)}' +
    '.sub-dark .sub-form input[type=email]{background:rgba(0,0,0,.35);border-color:rgba(255,255,255,.14);color:var(--text,#e8e2d9)}' +
    '.sub-dark .sub-form button{background:var(--accent,#c9a84c);color:#0e0e0e}' +
    '.sub-dark .sub-form button:hover{background:var(--text,#e8e2d9)}' +
    '.sub-dark .sub-msg.ok{color:#7bc47f}.sub-dark .sub-msg.err{color:#e57373}' +
    '@media(max-width:600px){.sub-box{margin:2rem 1rem;padding:1.5rem 1.25rem}.sub-form button{width:100%}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  document.querySelectorAll('[data-subscribe]').forEach(function (el) {
    if (isDark()) el.classList.add('sub-dark');
    el.innerHTML =
      '<section class="sub-box" aria-labelledby="sub-title">' +
        '<p class="sub-kicker">Newsletter</p>' +
        '<h2 class="sub-title" id="sub-title">Get new articles by email</h2>' +
        '<p class="sub-text">One email when a new post goes up. No spam, unsubscribe anytime.</p>' +
        '<form class="sub-form" novalidate>' +
          '<label class="sub-hp" aria-hidden="true">Company<input name="company" tabindex="-1" autocomplete="off"></label>' +
          '<input type="email" name="email" placeholder="you@example.com" autocomplete="email" required aria-label="Email address">' +
          '<button type="submit">Subscribe</button>' +
        '</form>' +
        '<p class="sub-msg" role="status" aria-live="polite"></p>' +
      '</section>';

    var form = el.querySelector('form');
    var msg = el.querySelector('.sub-msg');
    var btn = form.querySelector('button');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        msg.className = 'sub-msg err';
        msg.textContent = 'Please enter a valid email address.';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Sending…';
      msg.className = 'sub-msg';
      msg.textContent = '';
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, company: form.company.value })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d.error || 'Something went wrong.');
          form.reset();
          msg.className = 'sub-msg ok';
          msg.textContent = 'Almost done — check your inbox for a confirmation link.';
        })
        .catch(function (err) {
          msg.className = 'sub-msg err';
          msg.textContent = err.message || 'Something went wrong. Please try again.';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Subscribe';
        });
    });
  });

  function isDark() {
    var m = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
    return !!m && (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 100;
  }

  // Result banner after clicking the confirmation link (?subscribed=...)
  var params = new URLSearchParams(location.search);
  var state = params.get('subscribed');
  if (state) {
    var text = {
      '1': "You're subscribed. You'll get an email when the next article goes up.",
      invalid: 'That confirmation link is invalid. Try subscribing again.',
      error: 'Something went wrong confirming your subscription. Try again in a minute.'
    }[state];
    if (text) {
      var b = document.createElement('div');
      b.className = 'sub-banner';
      b.setAttribute('role', 'status');
      b.textContent = text;
      b.onclick = function () { b.remove(); };
      document.body.appendChild(b);
      setTimeout(function () { b.remove(); }, 8000);
    }
    params.delete('subscribed');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
  }
})();
