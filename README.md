# the Bull & the Bear

Static site for [bullandbearblog.com](https://bullandbearblog.com), served by GitHub Pages.
Pages are generated from `content/` by `tools/build.py`. Don't hand-edit the generated HTML
(`index.html`, `portfolio.html`, `about.html`, `disclaimer.html`, `articles/*.html`); edit the source and rebuild.

## Publish a new article
1. Write the body HTML to `content/articles/<slug>.html` (paragraphs, `h2`/`h3`, figures, lists).
2. Add an entry at the top of `content/articles.json`:
   ```json
   { "slug": "nvda-thesis", "title": "Investment Thesis: NVIDIA", "dek": "One-sentence summary.",
     "category": "thesis", "date": "2026-10-10", "image": "images/nvda-thesis.png",
     "ticker": "NVDA", "company": "NVIDIA Corporation",
     "call": { "call": "Long-term buy", "verdict": "open", "detail": "Long-term call in progress" } }
   ```
   `category` is `thesis`, `commentary` or `opinion`. `ticker`/`company`/`call` are for theses only.
   `verdict` is `correct`, `incorrect` or `open`. Update it in `articles.json` and rebuild once a call plays out.
3. Build: `python3 tools/build.py` (add `--prices` for a new thesis so its cover chart and tracker get price history).
4. Commit and push. The GitHub Action emails newsletter subscribers about any **new** file in `articles/`.

## Update the portfolio
Edit `assets/portfolio-data.js`: holdings (`shares`, `avgCost`), the trade log, and allocation.
Per-share prices and percentages only, never dollar amounts or position sizes. No rebuild needed.

## Layout
- `assets/site.css`, `assets/site.js`: design system and shared behaviour (live quotes, reveal motion, filters).
- `assets/portfolio.js`: portfolio page rendering.
- `subscribe.js`: newsletter sign-up form (backend: Vercel project `bullbear-subscribe`).
- `content/prices.json`: thesis price history for covers and the scoreboard.
