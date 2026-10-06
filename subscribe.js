// Email sign-up. Drop <div data-subscribe></div> anywhere; styles live in assets/site.css.
(function () {
  var API = 'https://bullbear-subscribe.vercel.app/api/subscribe';

  document.querySelectorAll('[data-subscribe]').forEach(function (el, n) {
    var id = 'sub-email-' + n;
    el.innerHTML =
      '<form class="sub-form" novalidate>' +
        '<label class="sub-hp" aria-hidden="true">Company<input name="company" tabindex="-1" autocomplete="off"></label>' +
        '<label class="sr-only" for="' + id + '">Email address</label>' +
        '<input id="' + id + '" type="email" name="email" placeholder="Your email address" autocomplete="email" required>' +
        '<button type="submit">Subscribe <span class="arr" aria-hidden="true">→</span></button>' +
      '</form>' +
      '<p class="sub-msg" role="status" aria-live="polite"></p>';

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
      msg.className = 'sub-msg';
      msg.textContent = 'Sending…';
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
          msg.textContent = 'Almost done. Check your inbox for a confirmation link.';
        })
        .catch(function (err) {
          msg.className = 'sub-msg err';
          msg.textContent = err.message || 'Something went wrong. Please try again.';
        })
        .finally(function () { btn.disabled = false; });
    });
  });

  // Result banner after clicking the confirmation link (?subscribed=...)
  var params = new URLSearchParams(location.search);
  var state = params.get('subscribed');
  if (state) {
    var text = {
      '1': "You're subscribed. You'll get an email when the next essay is published.",
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
