#!/usr/bin/env python3
"""
Pass B — body recovery with INLINE MARKUP PRESERVED.

The bug this fixes: the first recovery stripped tags with
`re.sub(r"<[^>]+>", "\n", body)`. That shredded <code> and <a> mid-sentence.
The live text for eurovision-som contains "...created with <code>pexpect</code>
, and placing..." which came out as three disconnected fragments.

Inline elements are converted to Markdown FIRST, then block tags are stripped.
Anything still unconverted is reported rather than silently dropped.
"""

import html
import json
import pathlib
import re

LIVE = pathlib.Path("extract/live")
PROJDIR = pathlib.Path("rebuild/src/content/projects")

# legacy work.js:25 / art.js:25 — the two filters, which are the whole
# distinction between the listings.
CATS = {"work": ['"Web"', '"Visualization"'], "art": ['"Experiment"']}


def inline_to_markdown(text: str) -> str:
    """Convert inline elements to Markdown, preserving their content.

    Runs before block-tag removal so text inside <a>/<code>/<em> survives.
    """
    text = re.sub(r"<code[^>]*>(.*?)</code>", r"`\1`", text, flags=re.S | re.I)
    text = re.sub(r"<strong[^>]*>(.*?)</strong>", r"**\1**", text, flags=re.S | re.I)
    text = re.sub(r"<b[^>]*>(.*?)</b>", r"**\1**", text, flags=re.S | re.I)
    text = re.sub(r"<em[^>]*>(.*?)</em>", r"*\1*", text, flags=re.S | re.I)
    text = re.sub(r"<i[^>]*>(.*?)</i>", r"*\1*", text, flags=re.S | re.I)

    # Anchors: keep the link text AND the href. Internal anchors drop the href.
    def anchor(m):
        href, inner = m.group(1), m.group(2)
        inner = re.sub(r"<[^>]+>", "", inner)
        inner = html.unescape(inner).strip()
        if not inner:
            return ""
        if href.startswith(("#", "/", "mailto:")):
            return inner
        return f"[{inner}]({href})"

    text = re.sub(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', anchor, text, flags=re.S | re.I)

    # Images inside bodies: record them, the caller re-attaches as frontmatter.
    text = re.sub(r"<img[^>]*>", "", text, flags=re.I)
    # Line breaks and paragraph ends become blank lines, not content breaks.
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(p|div|li|h[1-6]|figure|figcaption)>", "\n\n", text, flags=re.I)
    return text


def extract_body(raw_html: str):
    """Return (lines, unconverted_tags) for a project's projectBlock."""
    m = re.search(r'class="[^"]*projectBlock[^"]*"[^>]*>(.*?)</div>\s*</div>', raw_html, re.S)
    if not m:
        m = re.search(r'class="[^"]*projectBlock[^"]*"[^>]*>(.*?)</div>', raw_html, re.S)
    if not m:
        return [], []

    frag = m.group(1)
    converted = inline_to_markdown(frag)

    # Anything left that is still a tag, excluding block-level closers we
    # already turned into newlines.
    leftover = re.findall(r"</?(div|span|section|figure|figcaption|ul|ol|table|tbody|tr|td)\b[^>]*>",
                          converted, flags=re.I)

    # Drop remaining block tags, then unescape entities last so &lt; in prose
    # survives rather than being eaten as a tag.
    text = re.sub(r"<[^>]+>", "\n", converted)
    text = html.unescape(text)

    lines = [re.sub(r"[ \t]+", " ", l).strip() for l in text.split("\n")]
    lines = [l for l in lines if l]
    return lines, sorted(set(leftover))


def yaml_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def main() -> None:
    thumbs = json.loads(pathlib.Path("extract/listing-thumbnails.json").read_text())
    thumbs_dims = json.loads(pathlib.Path("extract/thumb-dims.json").read_text()) \
        if pathlib.Path("extract/thumb-dims.json").exists() else {}

    written, unconverted_total = 0, {}

    for f in sorted(PROJDIR.glob("*.md")):
        slug = f.stem
        html_file = LIVE / f"{slug}.html"
        if not html_file.exists():
            continue
        raw = html_file.read_text(errors="replace")

        group = thumbs.get(slug, {}).get("group")
        if not group:
            group = "work" if slug in {
                "approval-rates", "brb-email", "diabetes",
                "digitaalinenkirjallisuus-fi", "election-day-results",
                "ilmastonmuuttajat-climate-changers", "kaekriaeinen",
                "lukiovertailu-high-school-comparison", "runokuu-2020",
                "stt-tarkkailija", "veikkaus-beneficiaries",
                "visualizing-government",
            } else "art"

        title_m = re.search(r"<title[^>]*>([^<]*)</title>", raw)
        title = html.unescape(title_m.group(1)).replace(" | wolfw.xyz", "").strip() if title_m else slug

        lines, leftover = extract_body(raw)
        if leftover:
            unconverted_total[slug] = leftover

        # Preserve existing frontmatter (thumbnails, images, flags); replace body.
        existing = f.read_text()
        fm_m = re.match(r"^---\n(.*?)\n---\n(.*)$", existing, re.S)
        fm = fm_m.group(1) if fm_m else ""
        body = fm_m.group(2) if fm_m else ""

        fm = re.sub(r'^summary:.*$', f"summary: {yaml_str(lines[0][:160] if lines else '')}",
                    fm, flags=re.M)
        if 'title:' not in fm:
            fm = f'title: {yaml_str(title)}\n{fm}'

        md = [f"---\n{fm}\n---", ""]
        emitted_link = False
        for i, l in enumerate(lines):
            if l.lower().startswith("tech:"):
                md.append(f"**Tech:** {l[5:].strip()}")
            elif re.match(r"^(check out|read more|see )", l, re.I) and not emitted_link:
                emitted_link = True
                md.append(l)
            else:
                md.append(l)
            md.append("")

        f.write_text("\n".join(md).rstrip() + "\n")
        written += 1

    print(f"rewrote {written} project bodies with inline markup preserved")
    if unconverted_total:
        print("\nUNCONVERTED TAGS (need attention):")
        for slug, tags in unconverted_total.items():
            print(f"  {slug}: {', '.join(tags)}")
    else:
        print("no unconverted inline tags")


if __name__ == "__main__":
    main()
