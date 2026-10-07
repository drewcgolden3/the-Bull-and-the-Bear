#!/usr/bin/env python3
"""Build the Bull & the Bear site from content/.

    python3 tools/build.py            # rebuild index.html + every page in articles/
    python3 tools/build.py --prices   # also refresh thesis price history from Yahoo first

Adding an article:
  1. Write the body HTML to content/articles/<slug>.html (paragraphs, h2/h3, figures, lists).
  2. Add an entry to the top of content/articles.json:
       {"slug", "title", "dek", "category": "thesis"|"commentary"|"opinion", "date": "YYYY-MM-DD",
        "image": "images/<file>"  (optional for theses),
        "ticker", "company"       (theses only)}
  3. For a thesis, run with --prices so its cover chart and tracker pick up the new ticker.
  4. Run the build, commit, push. Subscribers are emailed automatically for new files in articles/.
"""
import datetime as dt
import html
import json
import math
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://bullandbearblog.com'
AUTHOR = 'Drew Golden'
SHORT = {'thesis': 'Thesis', 'commentary': 'Commentary', 'opinion': 'Opinion'}
CATS = {'thesis': 'Investment Thesis', 'commentary': 'Market Commentary', 'opinion': 'Opinion'}
FONTS = ('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500'
         '&family=Geist:wght@300..600&family=Geist+Mono:wght@400;500&display=swap')


def path(*p):
    return os.path.join(ROOT, *p)


def esc(s):
    return html.escape(str(s), quote=True)


def fmt_date(iso, short=False):
    d = dt.date.fromisoformat(iso)
    return d.strftime('%b %-d, %Y') if short else d.strftime('%B %-d, %Y')


def mono_date(iso):
    return dt.date.fromisoformat(iso).strftime('%m.%d.%y')


def read_minutes(body):
    words = len(re.sub(r'<[^>]+>', ' ', body).split())
    return max(1, math.ceil(words / 230))


# ---------------------------------------------------------------- prices

def refresh_prices(articles):
    prices = load_json('content/prices.json', {})
    for a in articles:
        if a.get('category') != 'thesis' or not a.get('ticker'):
            continue
        t = a['ticker']
        start = int((dt.datetime.fromisoformat(a['date']) - dt.timedelta(days=120)).timestamp())
        url = f'https://query1.finance.yahoo.com/v8/finance/chart/{t}?period1={start}&period2={int(dt.datetime.now().timestamp())}&interval=1d'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        r = json.load(urllib.request.urlopen(req, timeout=30))['chart']['result'][0]
        series = [(dt.datetime.utcfromtimestamp(ts).strftime('%Y-%m-%d'), round(c, 2))
                  for ts, c in zip(r['timestamp'], r['indicators']['quote'][0]['close']) if c]
        pub_i = next(i for i, (d, _) in enumerate(series) if d >= a['date'])
        series = series[max(0, pub_i - 60):]
        prices[t] = {'published': a['date'], 'pubPrice': series[min(pub_i, 60)][1], 'series': series}
        print(f'  {t}: {len(series)} sessions, published at {prices[t]["pubPrice"]}')
    with open(path('content/prices.json'), 'w') as f:
        json.dump(prices, f)
    return prices


def sparkline(p, cls='spark'):
    """SVG path of the price series with a dashed marker at the publication date."""
    if not p:
        return ''
    s = p['series']
    vals = [v for _, v in s]
    lo, hi = min(vals), max(vals)
    pad = (hi - lo) * 0.08 or 1
    lo, hi = lo - pad, hi + pad
    n = len(vals) - 1
    pts = [(i / n * 100, 40 - (v - lo) / (hi - lo) * 40) for i, v in enumerate(vals)]
    line = 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in pts)
    area = line + f' L100,40 L0,40 Z'
    pub_i = next((i for i, (d, _) in enumerate(s) if d >= p['published']), 0)
    px = pub_i / n * 100
    return (f'<svg class="{cls}" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">'
            f'<path class="area" d="{area}"/><path class="line" d="{line}"/>'
            f'<line class="pub" x1="{px:.2f}" x2="{px:.2f}" y1="0" y2="40"/></svg>')


# ---------------------------------------------------------------- partials

def head(title, desc, rel, url, image=None, extra=''):
    image = image or f'{SITE}/images/logo.png'
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}" />
  <link rel="canonical" href="{url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="the Bull &amp; the Bear" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(desc)}" />
  <meta property="og:url" content="{url}" />
  <meta property="og:image" content="{image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#131820" />
  <link rel="icon" href="{rel}images/logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="{FONTS}" />
  <link rel="stylesheet" href="{rel}assets/site.css" />
  <script>document.documentElement.classList.add('js')</script>
  <script src="{rel}assets/portfolio-data.js"></script>{extra}
</head>'''


def header(rel, current, ink=False, progress=False):
    def item(href, label, key):
        cur = ' aria-current="page"' if key == current else ''
        return f'<a class="link-line" href="{rel}{href}"{cur}>{label}</a>'
    return f'''
<a class="skip" href="#main">Skip to content</a>
<header class="site-header{' on-ink' if ink else ''}">
  <div class="wrap">
    <a class="brand" href="{rel}index.html" aria-label="the Bull &amp; the Bear, home">
      <img src="{rel}images/logo.png" alt="" width="34" height="34" />
      <span>the Bull &amp; the Bear</span>
    </a>
    <nav class="nav" aria-label="Primary">
      {item('index.html#journal', 'Journal', 'journal')}
      {item('portfolio.html', 'Portfolio', 'portfolio')}
      {item('about.html', 'About', 'about')}
      <a class="btn" href="#subscribe">Subscribe</a>
    </nav>
    <button class="menu-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span></button>
  </div>{'<div class="progress"></div>' if progress else ''}
</header>'''


def footer(rel, scripts=''):
    year = dt.date.today().year
    return f'''
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-top">
      <div>
        <p>Independent equity research and market commentary by {AUTHOR}. Every position disclosed. Nothing here is financial advice.</p>
      </div>
      <div>
        <h4>Read</h4>
        <ul>
          <li><a class="link-line" href="{rel}index.html#journal">Journal</a></li>
          <li><a class="link-line" href="{rel}portfolio.html">Portfolio</a></li>
        </ul>
      </div>
      <div>
        <h4>About</h4>
        <ul>
          <li><a class="link-line" href="{rel}about.html">The author</a></li>
          <li><a class="link-line" href="{rel}disclaimer.html">Disclaimer</a></li>
        </ul>
      </div>
      <div>
        <h4>Follow</h4>
        <ul>
          <li><a class="link-line" href="#subscribe">Email newsletter</a></li>
          <li><a class="link-line" href="https://www.linkedin.com/in/drewcgolden/" rel="noopener" target="_blank">LinkedIn</a></li>
          <li><a class="link-line" href="https://www.instagram.com/drewgolden_" rel="noopener" target="_blank">Instagram</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-markwrap"><div class="foot-mark" aria-hidden="true">Bull <em>&amp;</em> Bear</div></div>
  </div>
  <div class="wrap foot-base">
    <span>© 2025–{year} the Bull &amp; the Bear</span>
    <span>Prices delayed. Returns shown as percentages only.</span>
  </div>
</footer>
<script src="{rel}assets/site.js" defer></script>
<script src="{rel}subscribe.js" defer></script>{scripts}
</body>
</html>
'''


def visual(a, rel, prices, big=False):
    """Thesis -> data cover with real price chart. Everything else -> duotone photo."""
    if a['category'] == 'thesis' and a.get('ticker') in prices:
        p = prices[a['ticker']]
        return f'''<div class="cover">
  <div class="cover-top"><span>Thesis</span><span>{mono_date(a['date'])}</span></div>
  <div><div class="cover-tk">{esc(a['ticker'])}</div><div class="cover-name">{esc(a.get('company', ''))}</div></div>
  {sparkline(p)}
</div>'''
    img = a.get('image')
    if not img:
        return '<div class="media media--duo"></div>'
    loading = 'eager' if big else 'lazy'
    return f'<div class="media media--duo"><img src="{rel}{esc(img)}" alt="" loading="{loading}" decoding="async" /></div>'


def cat_label(a):
    return CATS[a['category']]


def subscribe_block(heading, note=True):
    return f'''<div data-subscribe></div>{'<p class="sub-note">One email per new essay. Unsubscribe anytime.</p>' if note else ''}'''


# ---------------------------------------------------------------- pages

def build_article(a, articles, prices, held):
    rel = '../'
    body = open(path('content/articles', a['slug'] + '.html')).read()
    mins = read_minutes(body)
    url = f'{SITE}/articles/{a["slug"]}.html'
    is_thesis = a['category'] == 'thesis' and a.get('ticker') in prices
    og = f'{SITE}/{a["image"]}' if a.get('image') and not a['image'].endswith('.svg') else None

    crumb_tk = f' <span class="sep">/</span> <span class="mono">{esc(a["ticker"])}</span>' if a.get('ticker') else ''
    tracker = ''
    if is_thesis:
        p = prices[a['ticker']]
        t = a['ticker']
        tracker = f'''
    <div class="tracker" data-reveal>
      <div><span class="eyebrow">Published</span><b>${p['pubPrice']:.2f}</b><small>{fmt_date(a['date'], True)}</small></div>
      <div><span class="eyebrow">Price now</span><b data-price="{t}">—</b><small data-today="{t}">&nbsp;</small></div>
      <div><span class="eyebrow">Since publication</span><b data-since="{p['pubPrice']}" data-tk="{t}">—</b><small>live, delayed</small></div>
      <div><span class="eyebrow">Position</span><b>{'Held' if t in held else 'Not held'}</b><small>{'In the portfolio' if t in held else 'Not in the portfolio'}</small></div>
    </div>'''

    same = [x for x in articles if x['slug'] != a['slug'] and (x['category'] == a['category'] or (a['category'] != 'thesis' and x['category'] != 'thesis'))]
    more = (same + [x for x in articles if x['slug'] != a['slug'] and x not in same])[:3]

    out = head(f'{a["title"]} — the Bull & the Bear', a['dek'], rel, url, og)
    out += '\n<body>' + header(rel, 'journal', progress=True)
    out += f'''
<main id="main">
  <article>
    <header class="a-head">
      <div class="wrap">
        <div class="crumbs eyebrow" data-reveal><a href="{rel}index.html#journal">Journal</a> <span class="sep">/</span> <span class="eyebrow--accent">{cat_label(a)}</span>{crumb_tk}</div>
        <h1 class="a-title"><span class="line-mask"><span>{esc(a['title'])}</span></span></h1>
        <p class="a-dek" data-reveal style="--d:150ms">{esc(a['dek'])}</p>
        <div class="byline" data-reveal style="--d:250ms">
          <span class="who"><img src="{rel}images/drew-avatar.jpg" alt="" />{AUTHOR}</span>
          <time datetime="{a['date']}">{fmt_date(a['date'])}</time>
          <span>{mins} min read</span>
        </div>{tracker}
      </div>
    </header>
    <div class="a-cover" data-reveal="fade">{visual(a, rel, prices, big=True)}</div>
    <div class="a-layout">
      <div class="prose">
{body}
      </div>
      <footer class="a-end">
        <div class="author">
          <img src="{rel}images/drew-avatar.jpg" alt="" />
          <div>
            <h3>{AUTHOR}</h3>
            <p>Student at Lehigh University's College of Business, investing since high school. I write about the companies I own and the markets they trade in. <a class="link-line" href="{rel}about.html">More about me</a></p>
          </div>
        </div>
        <p class="disclaim">This is personal research, not financial advice. I may hold positions in the securities discussed. <a href="{rel}disclaimer.html">Read the full disclaimer</a>.</p>
        <section class="a-sub" id="subscribe">
          <span class="eyebrow eyebrow--accent">Newsletter</span>
          <h3>Get the next essay by email.</h3>
          {subscribe_block('')}
        </section>
      </footer>
    </div>
  </article>
  <section class="wrap more" aria-label="More from the journal">
    <div class="archive-bar" style="border:0;padding:0"><span class="eyebrow">Keep reading</span><a class="arrow-link" href="{rel}index.html#journal">All essays <span class="arr">→</span></a></div>
    <div class="trio" data-stagger="110">
      {''.join(tile(x, rel, prices) for x in more)}
    </div>
  </section>
  <div style="height:var(--section)"></div>
</main>'''
    out += footer(rel)
    with open(path('articles', a['slug'] + '.html'), 'w') as f:
        f.write(out)


def tile(a, rel, prices):
    body = open(path('content/articles', a['slug'] + '.html')).read()
    return f'''<article class="tile" data-reveal>
        <a href="{rel}articles/{a['slug']}.html">{visual(a, rel, prices)}</a>
        <div>
          <span class="eyebrow">{cat_label(a)}</span>
          <h4><a class="link-line" href="{rel}articles/{a['slug']}.html">{esc(a['title'])}</a></h4>
          <div class="meta"><span>{fmt_date(a['date'], True)}</span><span>{read_minutes(body)} min</span></div>
        </div>
      </article>'''


def build_index(articles, prices, held):
    rel = ''
    feat, rest = articles[0], articles[1:]
    feat_body = open(path('content/articles', feat['slug'] + '.html')).read()
    n_thesis = sum(a['category'] == 'thesis' for a in articles)
    n_comm = len(articles) - n_thesis


    rows = []
    for a in articles:
        body = open(path('content/articles', a['slug'] + '.html')).read()
        cat = 'thesis' if a['category'] == 'thesis' else 'commentary'
        tk = f'<span class="tk">{esc(a["ticker"])}</span>' if a.get('ticker') else ''
        rows.append(f'''<li class="row" data-cat="{cat}">
          <a href="articles/{a['slug']}.html">
            <span class="row-date">{mono_date(a['date'])}</span>
            <span class="row-cat">{SHORT[a['category']]}{tk}</span>
            <span class="row-title">{esc(a['title'])}</span>
            <span class="row-time">{read_minutes(body)} min</span>
            <span class="row-arr" aria-hidden="true">→</span>
            <span class="row-thumb" aria-hidden="true">{visual(a, rel, prices)}</span>
          </a>
        </li>''')

    desc = f'Independent equity research and market commentary by {AUTHOR}. {len(articles)} essays, every thesis tracked against the market.'
    out = head('the Bull & the Bear — Independent equity research', desc, rel, SITE + '/')
    out += '\n<body>'
    out += f'''
<div class="tape" data-tape aria-label="Prices of current holdings"><div class="tape-track"></div></div>'''
    out += header(rel, None, ink=True)
    out += f'''
<main id="main">
  <div data-ink-under-header>
  <section class="hero" aria-labelledby="nameplate">
    <div class="hero-grid-lines"></div>
    <div class="wrap hero-inner">
      <div class="dateline" data-reveal="fade">
        <span class="eyebrow">Est. 2025</span>
        <span class="eyebrow" data-today-date>{dt.date.today().strftime('%A, %B %-d, %Y')}</span>
        <span class="eyebrow">{len(articles)} essays · {n_thesis} theses</span>
      </div>
      <h1 class="nameplate" id="nameplate">
        <span class="line-mask"><span>The Bull <em>&amp;</em></span></span>
        <span class="line-mask" style="text-align:right"><span style="--d:120ms">the Bear</span></span>
      </h1>
      <div class="hero-foot">
        <p data-reveal style="--d:300ms">Independent equity research and market commentary plus a portfolio page with every position disclosed.</p>
        <div class="hero-actions" data-reveal style="--d:400ms">
          <a class="btn btn--solid" href="articles/{feat['slug']}.html">Latest essay <span class="arr">→</span></a>
          <a class="btn btn--ghost" href="portfolio.html">The portfolio</a>
        </div>
      </div>
    </div>
  </section>

  </div>

  <section class="section" aria-labelledby="latest">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <h2 id="latest">The <em>latest</em></h2>
        <p>Long-form essays on individual companies and the markets they trade in.</p>
      </div>
      <article class="feature">
        <a href="articles/{feat['slug']}.html" data-reveal>{visual(feat, rel, prices, big=True)}</a>
        <div class="feature-text" data-reveal style="--d:120ms">
          <span class="eyebrow eyebrow--accent">{cat_label(feat)}</span>
          <h3><a class="link-line" href="articles/{feat['slug']}.html">{esc(feat['title'])}</a></h3>
          <p>{esc(feat['dek'])}</p>
          <div class="meta"><span>{fmt_date(feat['date'])}</span><span>{read_minutes(feat_body)} min read</span></div>
          <p style="margin-top:2rem"><a class="arrow-link" href="articles/{feat['slug']}.html">Read the essay <span class="arr">→</span></a></p>
        </div>
      </article>
      <div class="trio" data-stagger="110">
        {''.join(tile(a, rel, prices) for a in rest[:3])}
      </div>
    </div>
  </section>

  <section class="section" id="journal" aria-labelledby="journal-title" style="padding-top:0">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <h2 id="journal-title">The <em>journal</em></h2>
        <p>Every essay since 2025, newest first.</p>
      </div>
      <div class="archive-bar" data-reveal>
        <div class="filters" role="group" aria-label="Filter essays">
          <button class="filter" data-filter="all" aria-pressed="true">All<sup>{len(articles)}</sup></button>
          <button class="filter" data-filter="thesis" aria-pressed="false">Investment theses<sup>{n_thesis}</sup></button>
          <button class="filter" data-filter="commentary" aria-pressed="false">Commentary<sup>{n_comm}</sup></button>
        </div>
        <span class="archive-count">{len(articles)} pieces</span>
      </div>
      <ul class="rows">
        {''.join(rows)}
      </ul>
      <div class="peek" aria-hidden="true"></div>
    </div>
  </section>

  <section class="section dark" aria-labelledby="book-title" data-book>
    <div class="wrap book">
      <div data-reveal>
        <span class="eyebrow eyebrow--accent">The portfolio</span>
        <h2 id="book-title">I own what I write about.</h2>
        <p>{len(held)} positions, every buy and sell logged at its per-share price. Performance only, no dollar amounts.</p>
        <a class="btn btn--ghost" href="portfolio.html">See the holdings <span class="arr">→</span></a>
      </div>
      <div class="book-stat" data-reveal style="--d:150ms">
        <span class="eyebrow" style="color:var(--d-muted);display:block;padding-top:1.1rem">All-time return, live</span>
        <div class="book-big" data-book-total>—</div>
        <div class="book-row">
          <div><span class="eyebrow">Today</span><b data-book-day>—</b></div>
          <div><span class="eyebrow">Best</span><b data-book-best>—</b></div>
          <div><span class="eyebrow">Worst</span><b data-book-worst>—</b></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="subscribe" aria-labelledby="letter-title">
    <div class="wrap letter">
      <div data-reveal>
        <span class="eyebrow eyebrow--accent">Newsletter</span>
        <h2 id="letter-title">New essays, in your inbox.</h2>
        <p>One email when something new is published. No spam, no daily noise.</p>
      </div>
      <div data-reveal style="--d:150ms">
        {subscribe_block('')}
      </div>
    </div>
  </section>
</main>'''
    out += footer(rel)
    with open(path('index.html'), 'w') as f:
        f.write(out)


def page_shell(title, desc, slug, current, inner, ink=False, scripts=''):
    rel = ''
    out = head(f'{title} — the Bull & the Bear', desc, rel, f'{SITE}/{slug}.html')
    out += '\n<body>' + header(rel, current, ink=ink) + '\n<main id="main">' + inner + '\n</main>'
    out += footer(rel, scripts)
    with open(path(slug + '.html'), 'w') as f:
        f.write(out)


def newsletter_section():
    return f"""
  <section class="section" id="subscribe" aria-labelledby="letter-title" style="border-top:1px solid var(--rule)">
    <div class="wrap letter">
      <div data-reveal>
        <span class="eyebrow eyebrow--accent">Newsletter</span>
        <h2 id="letter-title">New essays, in your inbox.</h2>
        <p>One email when something new is published. No spam, no daily noise.</p>
      </div>
      <div data-reveal style="--d:150ms">{subscribe_block('')}</div>
    </div>
  </section>"""


def build_portfolio(articles):
    inner = """
  <div data-ink-under-header>
  <section class="dark pf-hero" aria-labelledby="pf-title">
    <div class="wrap">
      <span class="eyebrow eyebrow--accent" data-reveal="fade">Opened April 2026</span>
      <h1 id="pf-title"><span class="line-mask"><span>The <em>portfolio</em></span></span></h1>
      <p class="lede" data-reveal style="--d:150ms">Every position I hold and the thesis behind it, with live returns. I own what I write about, and every buy and sell is logged below at its per-share price. Performance only, no dollar amounts. Not financial advice.</p>
      <div class="pf-stats" data-reveal style="--d:250ms">
        <div><span class="eyebrow">All-time return</span><div class="pf-big" id="pf-total">—</div></div>
        <div><span class="eyebrow">Today</span><b id="pf-day">—</b></div>
        <div><span class="eyebrow">Best</span><b id="pf-best">—</b></div>
        <div><span class="eyebrow">Worst</span><b id="pf-worst">—</b></div>
        <div><span class="eyebrow">Winners / losers</span><b id="pf-wl">—</b></div>
      </div>
      <p class="pf-updated" id="pf-updated">Loading live prices…</p>
    </div>
  </section>
  </div>

  <section class="section" aria-labelledby="pos-title">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <h2 id="pos-title">Positions</h2>
        <p>Return on average cost. Tap a row for the reasoning behind it.</p>
      </div>
      <div class="archive-bar" style="border:0;padding-bottom:0.5rem" data-reveal>
        <div class="filters" role="group" aria-label="Sort positions">
          <button class="filter" data-sort="total" aria-pressed="true">Total return</button>
          <button class="filter" data-sort="today" aria-pressed="false">Today</button>
          <button class="filter" data-sort="ticker" aria-pressed="false">A–Z</button>
        </div>
      </div>
      <div class="pf-table-wrap" data-reveal>
        <table class="pf-table">
          <thead><tr><th>Holding</th><th>Type</th><th>Since</th><th>Price</th><th>Today</th><th>Total return</th><th>Thesis</th></tr></thead>
          <tbody id="pf-body"></tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0" aria-label="Performance and allocation">
    <div class="wrap pf-split">
      <div data-reveal>
        <h3>Return by position</h3>
        <div id="pf-chart"><p class="muted" style="font-size:var(--fs-sm)">Loading live data…</p></div>
      </div>
      <div data-reveal style="--d:120ms">
        <h3>Allocation</h3>
        <div class="al-group" id="al-type"></div>
        <div class="al-group" id="al-sector"></div>
        <div class="al-group" id="al-cash"></div>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0" aria-labelledby="log-title">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <h2 id="log-title">Trade <em>log</em></h2>
        <p>Recent buys and sells, newest first. Per-share prices only.</p>
      </div>
      <ul class="log" id="pf-log" data-reveal></ul>
      <p class="log-note" id="pf-log-note"></p>
    </div>
  </section>
""" + newsletter_section()
    page_shell('Portfolio', 'Every position in the Bull & the Bear portfolio, with live returns and a full trade log. Percentages only.',
               'portfolio', 'portfolio', inner, ink=True, scripts='\n<script src="assets/portfolio.js" defer></script>')


def build_about(articles):
    body = open(path('content/about.html')).read()
    n_thesis = sum(a['category'] == 'thesis' for a in articles)
    inner = f"""
  <section class="section">
    <div class="wrap about">
      <figure class="about-photo" data-reveal="fade">
        <div class="frame"><img src="images/drew.jpg" alt="{AUTHOR}" width="960" height="1200" /></div>
        <figcaption><span>{AUTHOR}</span><span>Lehigh University</span></figcaption>
      </figure>
      <div class="about-text">
        <span class="eyebrow eyebrow--accent" data-reveal>About the author</span>
        <h1><span class="line-mask"><span>Meet {AUTHOR}.</span></span></h1>
        <div class="prose" data-reveal style="--d:150ms">
{body}
        </div>
        <div class="about-facts" data-reveal>
          <div><span class="eyebrow">Essays</span><b>{len(articles)}</b></div>
          <div><span class="eyebrow">Theses</span><b>{n_thesis}</b></div>
          <div><span class="eyebrow">Writing since</span><b>2025</b></div>
        </div>
        <div class="about-links" data-reveal>
          <a class="btn" href="https://www.linkedin.com/in/drewcgolden/" rel="noopener" target="_blank">LinkedIn <span class="arr">→</span></a>
          <a class="btn" href="https://www.instagram.com/drewgolden_" rel="noopener" target="_blank">Instagram <span class="arr">→</span></a>
          <a class="btn" href="portfolio.html">The portfolio <span class="arr">→</span></a>
        </div>
      </div>
    </div>
  </section>""" + newsletter_section()
    page_shell('About', f'{AUTHOR} is a Lehigh University business student writing independent equity research and market commentary.',
               'about', 'about', inner)


def build_disclaimer():
    body = open(path('content/disclaimer.html')).read()
    inner = f"""
  <header class="page-head">
    <div class="wrap">
      <span class="eyebrow eyebrow--accent" data-reveal>Legal</span>
      <h1><span class="line-mask"><span>Investment advice disclaimer</span></span></h1>
    </div>
  </header>
  <div class="wrap page-body">
    <div class="prose" data-reveal>
{body}
    </div>
  </div>"""
    page_shell('Disclaimer', 'Nothing on the Bull & the Bear is financial advice. Read the full investment disclaimer.',
               'disclaimer', None, inner)


def load_json(p, default=None):
    try:
        with open(path(p)) as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def held_tickers():
    src = open(path('assets/portfolio-data.js')).read()
    return set(re.findall(r"ticker:'([A-Z.]+)'", src))


def main():
    articles = sorted(load_json('content/articles.json'), key=lambda a: a['date'], reverse=True)
    prices = refresh_prices(articles) if '--prices' in sys.argv else load_json('content/prices.json', {})
    held = held_tickers()
    for a in articles:
        build_article(a, articles, prices, held)
    build_index(articles, prices, held)
    build_portfolio(articles)
    build_about(articles)
    build_disclaimer()
    print(f'Built index.html, portfolio, about, disclaimer and {len(articles)} articles.')


if __name__ == '__main__':
    main()
