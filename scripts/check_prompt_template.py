"""检查完整中文提示词的栏目、填空残留和语言；不评估剧情或生成效果。"""
import argparse
import re
import unicodedata
from pathlib import Path

HEADINGS = (
    "片段任务", "素材绑定", "场景与起始状态", "分镜时间轴", "摄影机与焦点",
    "表演与物理反馈", "光线与画风", "声音与台词", "结束状态与限制",
)
FIXED_FORMAT = "中文固定模板"
FREE_FORMAT = "自由格式"


def validate_prompt(prompt, prompt_format=FIXED_FORMAT):
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("完整提示词不能为空")
    if prompt_format == FREE_FORMAT:
        return
    if prompt_format != FIXED_FORMAT:
        raise ValueError("未知提示词格式，请使用中文固定模板或明确指定的自由格式")
    normalized = unicodedata.normalize("NFKC", prompt)
    if re.search(r"[A-Za-z]", normalized):
        raise ValueError("固定模板正文须全中文；文件名、链接、平台标签和代码字段请放在上传清单中")
    if re.search(r"〔填写|\{\{|待填写|请填写|自行补充|其余同上|其他同上", prompt):
        raise ValueError("提示词仍有填空说明或需要用户拼接的内容")
    markers = list(re.finditer(r"^【([^\n】]+)】\s*$", prompt, re.MULTILINE))
    if [m.group(1) for m in markers] != list(HEADINGS):
        raise ValueError("提示词须按顺序包含九个栏目：" + "、".join(HEADINGS))
    if prompt[:markers[0].start()].strip():
        raise ValueError("正文从【片段任务】开始，提交说明请放在正文之外")
    for index, marker in enumerate(markers):
        end = markers[index + 1].start() if index + 1 < len(markers) else len(prompt)
        body = prompt[marker.end():end].strip()
        if not re.search(r"[\u3400-\u9fff]", body) or body in {"同上", "略", "待补充", "无"}:
            raise ValueError("栏目缺少实际内容：" + marker.group(1))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", type=Path, nargs="+", help="已填写的中文提示词文本文件")
    args = parser.parse_args()
    try:
        for path in args.files:
            validate_prompt(path.read_text(encoding="utf-8-sig"))
            print(path.name + "：中文模板结构通过；剧情、素材绑定与视频效果仍需另行核验")
    except (OSError, ValueError) as exc:
        parser.exit(1, str(exc) + "\n")
