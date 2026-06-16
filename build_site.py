import re
from pathlib import Path


SECTIONS = ["home", "research", "teaching", "cv", "events"]
CONFIG_IDS = ["page-top-title", "top-section-bg-text", "home-subtitle", "copyright-text"]


def render_inline(text):
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)


def join_markdown_lines(lines):
    output = []
    for index, line in enumerate(lines):
        if index > 0:
            output.append("<br />\n" if lines[index - 1].endswith("  ") else "\n")
        output.append(line.rstrip(" "))
    return "".join(output)


def markdown_to_html(markdown_text):
    lines = markdown_text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    html_blocks = []
    index = 0

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()

        if not stripped:
            index += 1
            continue

        if stripped.startswith("<!--"):
            comment_lines = [line]
            index += 1
            while index < len(lines) and "-->" not in lines[index - 1]:
                comment_lines.append(lines[index])
                index += 1
            html_blocks.append("\n".join(comment_lines))
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            level = len(heading.group(1))
            html_blocks.append(f"<h{level}>{render_inline(heading.group(2))}</h{level}>")
            index += 1
            continue

        if stripped.startswith("- "):
            items = []
            while index < len(lines):
                current = lines[index]
                current_stripped = current.strip()

                if not current_stripped:
                    index += 1
                    continue

                if not current_stripped.startswith("- "):
                    break

                item_lines = [current_stripped[2:]]
                index += 1

                while index < len(lines):
                    continuation = lines[index]
                    continuation_stripped = continuation.strip()
                    if (
                        not continuation_stripped
                        or continuation_stripped.startswith("- ")
                        or re.match(r"^#{1,6}\s+", continuation_stripped)
                        or continuation_stripped.startswith("<!--")
                    ):
                        break
                    item_lines.append(continuation_stripped)
                    index += 1

                item_html = render_inline(join_markdown_lines(item_lines))
                items.append(f"<li>{item_html}</li>")

            html_blocks.append("<ul>\n" + "\n".join(items) + "\n</ul>")
            continue

        paragraph_lines = [line]
        index += 1
        while index < len(lines):
            next_line = lines[index]
            next_stripped = next_line.strip()
            if (
                not next_stripped
                or next_stripped.startswith("- ")
                or next_stripped.startswith("<!--")
                or re.match(r"^#{1,6}\s+", next_stripped)
            ):
                break
            paragraph_lines.append(next_line)
            index += 1

        paragraph = render_inline(join_markdown_lines([item.strip() for item in paragraph_lines]))
        if re.fullmatch(r"<p[^>]*>[\s\S]*</p>", paragraph):
            html_blocks.append(paragraph)
        else:
            html_blocks.append(f"<p>{paragraph}</p>")

    return "\n".join(html_blocks).strip() + "\n"


def parse_config(config_text):
    values = {}
    for line in config_text.splitlines():
        if ":" not in line or line.lstrip().startswith("#"):
            continue
        key, value = line.split(":", 1)
        value = value.strip()
        if (value.startswith("'") and value.endswith("'")) or (value.startswith('"') and value.endswith('"')):
            value = value[1:-1]
        values[key.strip()] = value
    return values


def replace_element_content(html, element_id, content):
    pattern = re.compile(
        rf'(<(?P<tag>[a-zA-Z0-9]+)(?P<attrs>[^>]*\bid="{re.escape(element_id)}"[^>]*)>)([\s\S]*?)(</(?P=tag)>)'
    )
    for match in pattern.finditer(html):
        last_comment_open = html.rfind("<!--", 0, match.start())
        last_comment_close = html.rfind("-->", 0, match.start())
        if last_comment_open > last_comment_close:
            continue

        return html[: match.start()] + f"{match.group(1)}{content}{match.group(5)}" + html[match.end() :]

    raise ValueError(f"Could not find visible element with id={element_id}")


def set_body_prerendered(html):
    pattern = re.compile(r'<body id="page-top"[^>]*>')
    updated, count = pattern.subn('<body id="page-top" class="site-preparing" data-prerendered="true">', html, count=1)
    if count != 1:
        raise ValueError("Could not update body tag")
    return updated


def replace_title(html, title):
    return re.sub(r"<title>[\s\S]*?</title>", f"<title>{title}</title>", html, count=1)


def build_site():
    output_dir = Path("contents/content_built")
    output_dir.mkdir(exist_ok=True)

    rendered_sections = {}
    for section in SECTIONS:
        md_path = Path("contents") / f"{section}.md"
        html_path = output_dir / f"{section}.html"

        print(f"Building {section}...")

        if md_path.exists():
            html_content = markdown_to_html(md_path.read_text(encoding="utf-8"))
            html_path.write_text(html_content, encoding="utf-8")
            rendered_sections[section] = html_content
            print(f"Built {section}")
        else:
            rendered_sections[section] = ""
            print(f"{md_path} not found")

    config = parse_config(Path("contents/config.yml").read_text(encoding="utf-8"))
    index_path = Path("index.html")
    index_html = index_path.read_text(encoding="utf-8")

    index_html = set_body_prerendered(index_html)
    if config.get("title"):
        index_html = replace_title(index_html, config["title"])

    for key in CONFIG_IDS:
        index_html = replace_element_content(index_html, key, config.get(key, ""))

    for section, html_content in rendered_sections.items():
        index_html = replace_element_content(index_html, f"{section}-md", html_content)

    index_path.write_text(index_html, encoding="utf-8", newline="\n")
    print("Build completed!")


if __name__ == "__main__":
    build_site()
