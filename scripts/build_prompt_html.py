"""Build an offline prompt workspace from existing local images and UTF-8 TXT files.

No generation, network calls, third-party dependencies or automatic video approval.
"""
import argparse
import html
import json
import os
from pathlib import Path, PureWindowsPath
from urllib.parse import quote


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
    return quote(Path(os.path.relpath(path, output_dir)).as_posix(), safe="/")


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
        if not prompt.strip():
            raise ValueError("Prompt text must not be empty")
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
<div class="prompt-head"><h3>完整视频提示词</h3><div class="actions"><button type="button" data-copy="prompt-{index}" aria-describedby="copy-status-{index}">复制完整提示词</button><a class="download" href="{relative_url(prompt_file, output_dir)}" download="{text(prompt_file.name)}">下载 TXT</a></div></div>
<pre id="prompt-{index}" tabindex="0">{text(prompt)}</pre><p id="copy-status-{index}" class="copy-status" role="status" aria-live="polite"></p>
</article>''')
    return TEMPLATE.replace("<!--TITLE-->", text(plan["title"])).replace("<!--NAV-->", "".join(navigation)).replace("<!--CONTENT-->", "".join(cards))


TEMPLATE = '''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title><!--TITLE--> · 分镜与提示词</title>
<style>
:root{color-scheme:dark;--bg:#0c1010;--card:#151b1a;--line:#35413d;--ink:#eef4ef;--muted:#afbbb5;--accent:#d6f264}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1260px;margin:auto;padding:36px 24px}h1{font-size:clamp(28px,4vw,48px);line-height:1.2;margin:12px 0}h2{font-size:28px;margin:0}h3{margin:0;font-size:20px}.eyebrow{color:var(--accent);letter-spacing:.06em;margin:0}.muted,figcaption,.copy-status{color:var(--muted)}nav{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}a{color:var(--accent);text-underline-offset:4px;overflow-wrap:anywhere}nav a,.download,button{border:1px solid var(--line);padding:8px 14px;border-radius:6px;text-decoration:none}article{border:1px solid var(--line);padding:24px;margin-bottom:28px;background:var(--card);scroll-margin-top:16px}.status{font-size:14px;color:var(--muted)}.frames{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px;margin:20px 0}figure{margin:0;min-width:0}img{display:block;width:100%;height:200px;object-fit:contain;background:#080a0a}figcaption{font-size:14px;padding:8px 0;overflow-wrap:anywhere}video{display:block;width:100%;max-height:560px;background:#000}.prompt-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:26px}.actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}button{cursor:pointer;background:var(--accent);color:#18200b;font:inherit;font-weight:650}button:focus-visible,a:focus-visible{outline:3px solid #fff;outline-offset:3px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.8;padding:20px;background:#0b100e;border:1px solid var(--line);margin:16px 0 0;tab-size:2}footer{color:var(--muted);font-size:14px;border-top:1px solid var(--line);padding-top:18px}@media(max-width:560px){main{padding:22px 12px}article{padding:16px}pre{padding:14px}.actions{width:100%}button,.download{font-size:14px}img{height:auto;max-height:360px}}
</style></head><body><main><p class="eyebrow">CINEMA DNA 3.2 · 图文工作台</p><h1><!--TITLE--></h1><p class="muted">查看分镜与参考职责，复制整段提示词，再按实际入口上传素材。此网页不会自动生成或提交视频。</p><nav aria-label="段落导航"><!--NAV--></nav><!--CONTENT--><footer>随整个任务目录保存与分享，保留图片和 TXT 的相对位置。提示词检查与视频验收是不同状态。</footer></main>
<script>
document.querySelectorAll('[data-copy]').forEach(function(button){button.addEventListener('click',async function(){var pre=document.getElementById(button.dataset.copy);var message=document.getElementById(button.getAttribute('aria-describedby'));var value=pre.textContent;var copied=false;try{if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(value);copied=true}}catch(error){}if(!copied){var field=document.createElement('textarea');field.value=value;field.style.position='fixed';field.style.left='-10000px';document.body.appendChild(field);field.focus();field.select();try{copied=document.execCommand('copy')}catch(error){}field.remove();button.focus()}if(copied){message.textContent='已复制完整提示词'}else{var range=document.createRange();range.selectNodeContents(pre);var selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);pre.focus();message.textContent='浏览器限制了复制，已选中正文，请手动复制。'}})});
</script></body></html>'''


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
