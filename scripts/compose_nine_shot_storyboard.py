#!/usr/bin/env python3
"""九镜拼版：Python 3.9+ / Pillow，支持 macOS、Linux 与 Windows。"""
from __future__ import annotations

import argparse
from contextlib import ExitStack
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile


def _pillow():
    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise RuntimeError(
            '缺少 Pillow；请在所用 Python 环境中运行：'
            'python -m pip install -r scripts/requirements-storyboard.txt。'
            'macOS 建议先创建虚拟环境，详见 references/九镜拼版使用说明.md。'
        ) from exc
    return Image, ImageOps


def _fit(canvas, image, x, y, width, height, Image):
    scale = min(width / image.width, height / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    with image.resize(size, Image.Resampling.LANCZOS) as resized:
        canvas.paste(resized, (x + (width - size[0]) // 2, y + (height - size[1]) // 2))


def compose(sources, output_dir, prefix, cell_width=960, cell_height=402, gap=8):
    """按输入顺序生成 9 张独立 PNG、3 张纵向三联和 1 张接触表。"""
    if len(sources) != 9:
        raise ValueError(f'必须提供 9 张源图，实际收到 {len(sources)} 张。')
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', prefix):
        raise ValueError('文件名前缀仅允许英文字母、数字、下划线和连字符。')
    for name, value, lower, upper in (
        ('单格宽度', cell_width, 320, 3840),
        ('单格高度', cell_height, 134, 1607),
        ('间隔', gap, 0, 64),
    ):
        if type(value) is not int or not lower <= value <= upper:
            raise ValueError(f'{name}必须是 {lower} 至 {upper} 的整数。')

    paths = [Path(source).expanduser().resolve() for source in sources]
    for path in paths:
        if not path.is_file():
            raise ValueError(f'源图不存在或不是文件：{path}')
    output = Path(output_dir).expanduser().resolve()
    shot_names = [f'{prefix}_shot{i:02d}.png' for i in range(1, 10)]
    triptych_names = [f'{prefix}_triptych_{i}.png' for i in range(1, 4)]
    contact_name = f'{prefix}_3x3_contact_sheet.png'
    names = shot_names + triptych_names + [contact_name]
    for name in names:
        target = output / name
        for path in paths:
            if target.resolve() == path or (target.exists() and target.samefile(path)):
                raise ValueError(f'输出会覆盖源图，请更换输出目录或前缀：{target}')

    Image, ImageOps = _pillow()
    sheet_width = cell_width * 3 + gap * 2
    sheet_height = cell_height * 3 + gap * 2
    triptych_width = cell_width * 2
    triptych_cell_height = round(triptych_width / 2.39)

    # 先完整解码全部输入；坏图不应留下只有一半的交付文件。
    with ExitStack() as stack:
        images = []
        formats = []
        for path in paths:
            try:
                with Image.open(path) as original:
                    formats.append(original.format)
                    with ImageOps.exif_transpose(original) as oriented:
                        flattened = stack.enter_context(Image.new('RGB', oriented.size, 'black'))
                        with oriented.convert('RGBA') as rgba, rgba.getchannel('A') as alpha:
                            flattened.paste(rgba, (0, 0), alpha)
                        images.append(flattened)
            except (OSError, ValueError, Image.DecompressionBombError) as exc:
                raise ValueError(f'无法读取源图：{path}；{exc}') from exc

        output.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.storyboard-', dir=output) as staging:
            stage = Path(staging)
            for path, fmt, image, name in zip(paths, formats, images, shot_names):
                if fmt == 'PNG':
                    shutil.copy2(path, stage / name)
                else:
                    # 不把 JPEG 等源文件直接改名为 .png；原文件始终不动。
                    image.save(stage / name, format='PNG')

            for group, name in enumerate(triptych_names):
                with Image.new('RGB', (triptych_width, triptych_cell_height * 3 + gap * 2), 'black') as canvas:
                    for slot in range(3):
                        _fit(canvas, images[group * 3 + slot], 0,
                             slot * (triptych_cell_height + gap),
                             triptych_width, triptych_cell_height, Image)
                    canvas.save(stage / name, format='PNG')

            with Image.new('RGB', (sheet_width, sheet_height), 'black') as canvas:
                for index, image in enumerate(images):
                    _fit(canvas, image, (index % 3) * (cell_width + gap),
                         (index // 3) * (cell_height + gap), cell_width, cell_height, Image)
                canvas.save(stage / contact_name, format='PNG')

            for name in names:
                os.replace(stage / name, output / name)

    return {
        'SourceCount': 9, 'ShotCount': 9, 'TriptychCount': 3,
        'ContactSheet': str(output / contact_name),
        'ContactWidth': sheet_width, 'ContactHeight': sheet_height,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', nargs=9, required=True, metavar='图片')
    parser.add_argument('--output-dir', required=True, help='输出目录，可含中文和空格')
    parser.add_argument('--prefix', required=True, help='文件名前缀：字母、数字、下划线或连字符')
    parser.add_argument('--cell-width', type=int, default=960, help='接触表单格宽，默认 960')
    parser.add_argument('--cell-height', type=int, default=402, help='接触表单格高，默认 402')
    parser.add_argument('--gap', type=int, default=8, help='黑色间隔像素，默认 8')
    args = parser.parse_args(argv)
    if sys.version_info < (3, 9):
        parser.error('请使用 Python 3.9 或更新版本。')
    try:
        result = compose(args.sources, args.output_dir, args.prefix,
                         args.cell_width, args.cell_height, args.gap)
    except (OSError, ValueError, RuntimeError) as exc:
        parser.error(str(exc))
    # ASCII JSON 避免 Windows PowerShell 5.1 的原生命令编码差异。
    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
