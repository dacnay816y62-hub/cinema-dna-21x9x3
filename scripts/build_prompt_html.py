"""Build an offline prompt workspace from existing local images and UTF-8 TXT files.

No generation, network calls, third-party dependencies or automatic video approval.
"""
import argparse
import base64
import html
import json
import os
from pathlib import Path, PureWindowsPath
from urllib.parse import quote
from check_prompt_template import validate_prompt, FIXED_FORMAT


def text(value):
    return html.escape(str(value), quote=True)


def local_file(base, value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Asset paths must be nonempty relative strings")
    normalized = value.replace("\\", "/")
    if Path(normalized).is_absolute() or PureWindowsPath(value).drive or ":" in normalized:
        raise ValueError("Remote URLs and absolute asset paths are not accepted")
    candidate = (base / normalized).resolve()
    if not candidate.is_relative_to(base.resolve()) or not candidate.is_file():
        raise ValueError("Missing asset or reference outside the manifest directory: " + value)
    return candidate


def relative_url(path, output_dir):
    # macOS /var is commonly a symlink to /private/var. Normalize both ends
    # before relativizing so a shared page never leaks the local source path.
    return quote(Path(os.path.relpath(Path(path).resolve(), Path(output_dir).resolve())).as_posix(), safe="/")


def render(plan, base, output_dir):
    if not isinstance(plan, dict) or not isinstance(plan.get("title"), str) or not plan["title"].strip():
        raise ValueError("title must be a nonempty string")
    segments = plan.get("segments")
    if not isinstance(segments, list) or not segments:
        raise ValueError("segments must be a nonempty list")
    cards, navigation, ids = [], [], set()
    for index, segment in enumerate(segments, 1):
        if not isinstance(segment, dict):
            raise ValueError("Each segment must be an object")
        sid = segment.get("id")
        if not isinstance(sid, str) or not sid.strip() or sid in ids:
            raise ValueError("Every segment needs a unique nonempty id")
        ids.add(sid)
        title = segment.get("title", sid)
        if not isinstance(title, str) or not title.strip():
            raise ValueError("Segment title must be a nonempty string")
        shot_ids = segment.get("shot_ids", [])
        if not isinstance(shot_ids, list) or any(not isinstance(s, str) for s in shot_ids):
            raise ValueError("shot_ids must be a list of strings")
        prompt_file = local_file(base, segment.get("prompt_file"))
        if prompt_file.suffix.lower() != ".txt":
            raise ValueError("prompt_file must point to a UTF-8 TXT file")
        prompt = prompt_file.read_text(encoding="utf-8-sig")
        validate_prompt(prompt, segment.get("prompt_format", FIXED_FORMAT))
        images = segment.get("images", [])
        if not isinstance(images, list):
            raise ValueError("images must be a list")
        figures = []
        for image in images:
            if not isinstance(image, dict) or not isinstance(image.get("role"), str) or not image["role"].strip():
                raise ValueError("Each image needs a path and a reference role")
            image_file = local_file(base, image.get("path"))
            if image_file.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"}:
                raise ValueError("Unsupported image file type")
            url = relative_url(image_file, output_dir)
            figures.append(f'<figure><a href="{url}" target="_blank" rel="noopener"><img src="{url}" alt="{text(image["role"])}" loading="lazy"></a><figcaption><strong>{text(image_file.name)}</strong><br>{text(image["role"])}</figcaption></figure>')
        media = '<div class="frames">' + "".join(figures) + '</div>' if figures else '<p class="muted">本段未提供分镜图；请按正文准备所需参考。</p>'
        if segment.get("video"):
            video_file = local_file(base, segment["video"])
            if video_file.suffix.lower() not in {".mp4", ".mov", ".webm", ".ogg"}:
                raise ValueError("Unsupported video file type")
            media += f'<video controls preload="metadata" src="{relative_url(video_file, output_dir)}"></video><p class="muted">{text(video_file.name)} · 文件存在不等于已经验收</p>'
        meta = " / ".join([str(segment.get("mode", "模式见正文")), str(segment.get("duration", "时长见正文")), "覆盖镜号：" + ("、".join(shot_ids) or "见正文")])
        status = segment.get("status", "提示词已整理，视频未验收")
        navigation.append(f'<a href="#segment-{index}">{text(sid)} · {text(title)}</a>')
        cards.append(f'''<article id="segment-{index}">
<header><p class="eyebrow">{text(sid)}</p><h2>{text(title)}</h2><p>{text(meta)}</p><p class="status">{text(status)}</p></header>
{media}
<div class="prompt-head"><h3>完整视频提示词</h3><div class="actions"><button type="button" data-copy="prompt-{index}" aria-describedby="copy-status-{index}">复制完整提示词</button><a class="download" href="{relative_url(prompt_file, output_dir)}" download="{text(prompt_file.name)}">下载提示词文本</a></div></div>
<pre id="prompt-{index}" tabindex="0">{text(prompt)}</pre><p id="copy-status-{index}" class="copy-status" role="status" aria-live="polite"></p>
</article>''')
    return load_template().replace("<!--TITLE-->", text(plan["title"])).replace("<!--NAV-->", "".join(navigation)).replace("<!--CONTENT-->", "".join(cards))


TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "assets" / "prompt-workspace" / "template.html"
LOGO_PATH = Path(__file__).resolve().parents[1] / "assets" / "fantasy-brand" / "fantasy-logo.png"


def load_template():
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    tokens = ("<!--TITLE-->", "<!--NAV-->", "<!--CONTENT-->", "<!--LOGO_DATA-->")
    if any(token not in template for token in tokens):
        raise ValueError("Workspace template is missing required placeholders")
    logo = base64.b64encode(LOGO_PATH.read_bytes()).decode("ascii")
    return template.replace("<!--LOGO_DATA-->", "data:image/png;base64," + logo)


def build(manifest, output=None, force=False):
    manifest = Path(manifest).resolve()
    output = Path(output).resolve() if output else manifest.parent / "分镜与提示词.html"
    if output.exists() and not force:
        raise FileExistsError("Output exists; choose another name or explicitly pass --force")
    if output.suffix.lower() not in {".html", ".htm"} or output == manifest:
        raise ValueError("Output must be a separate HTML file")
    plan = json.loads(manifest.read_text(encoding="utf-8-sig"))
    page = render(plan, manifest.parent, output.parent)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w" if force else "x", encoding="utf-8", newline="\n") as handle:
        handle.write(page)
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    try:
        print(build(args.manifest, args.output, args.force))
    except (OSError, ValueError, TypeError) as exc:
        parser.exit(1, str(exc) + "\n")
