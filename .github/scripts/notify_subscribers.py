"""Email subscribers about newly added articles via the bullbear-subscribe backend."""
import html
import json
import os
import re
import sys
import urllib.request

SITE = "https://bullandbearblog.com"
ENDPOINT = "https://bullbear-subscribe.vercel.app/api/notify"


def text(fragment):
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def describe(path):
    src = open(path, encoding="utf-8").read()
    h1 = re.search(r'<h1[^>]*class="article-title"[^>]*>(.*?)</h1>', src, re.S)
    title = text(h1.group(1)) if h1 else text(re.search(r"<title>(.*?)</title>", src, re.S).group(1)).split(" — ")[0].split(" | ")[0]
    body = re.search(r'class="article-body"[^>]*>(.*)', src, re.S)
    excerpt = ""
    for p in re.findall(r"<p[^>]*>(.*?)</p>", body.group(1) if body else src, re.S):
        excerpt = text(p)
        if len(excerpt) > 60:
            break
    if len(excerpt) > 280:
        excerpt = excerpt[:277].rsplit(" ", 1)[0] + "…"
    slug = os.path.splitext(os.path.basename(path))[0]
    image = next((f"{SITE}/images/{slug}.{ext}" for ext in ("png", "jpg") if os.path.exists(f"images/{slug}.{ext}")), None)
    return {"title": title, "url": f"{SITE}/{path}", "excerpt": excerpt, "image": image}


def main(paths):
    failed = False
    for path in paths:
        payload = describe(path)
        print(f"Notifying subscribers: {payload['title']} -> {payload['url']}")
        if os.environ.get("DRY_RUN"):
            print(json.dumps(payload, indent=2))
            continue
        req = urllib.request.Request(
            ENDPOINT,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {os.environ['NOTIFY_SECRET']}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                print(r.status, r.read().decode())
        except urllib.error.HTTPError as e:
            print(e.code, e.read().decode(), file=sys.stderr)
            failed = True
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main([p for p in sys.argv[1:] if p.startswith("articles/") and p.endswith(".html")])
