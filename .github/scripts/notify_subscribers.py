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
    """Pull title, summary and image from the built page's meta tags."""
    src = open(path, encoding="utf-8").read()

    def meta(prop):
        m = re.search(r'<meta (?:property|name)="%s" content="([^"]*)"' % re.escape(prop), src)
        return html.unescape(m.group(1)) if m else ""

    title = meta("og:title").rsplit(" — the Bull & the Bear", 1)[0]
    excerpt = meta("og:description")
    if len(excerpt) > 280:
        excerpt = excerpt[:277].rsplit(" ", 1)[0] + "…"
    image = meta("og:image")
    if not image or image.endswith(("logo.png", ".svg")):
        image = None
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
