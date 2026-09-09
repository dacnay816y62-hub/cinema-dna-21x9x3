#!/usr/bin/env python3
"""Compose nine ordered still images; requires Python 3.10+ and Pillow."""
import argparse
from contextlib import ExitStack
import json
from pathlib import Path
import re
import sys
import tempfile


def bounded(low, high):
    def parse(value):
        number = int(value)
        if not low <= number <= high:
            raise argparse.ArgumentTypeError(f"Expected {low}..{high}, got {value}")
        return number
    return parse


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', nargs=9, type=Path, required=True,
                        help='Exactly nine files, in shot order (no automatic sorting).')
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--prefix', required=True)
    parser.add_argument('--cell-width', type=bounded(320, 3840), default=960)
    parser.add_argument('--cell-height', type=bounded(134, 1607), default=402)
    parser.add_argument('--gap', type=bounded(0, 64), default=8)
    parser.add_argument('--overwrite', action='store_true',
                        help='Replace existing outputs, but never input files.')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', args.prefix):
        parser.error('--prefix must contain only ASCII letters, digits, _ or -')
    return args


def compose(args):
    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise ValueError('Pillow is required. Run: python -m pip install -r scripts/requirements-storyboard.txt') from exc

    names = [f'{args.prefix}_shot{i:02d}.png' for i in range(1, 10)]
    names += [f'{args.prefix}_triptych_{i}.png' for i in range(1, 4)]
    names += [f'{args.prefix}_3x3_contact_sheet.png']
    destinations = [args.output_dir / name for name in names]
    for source in args.sources:
        if not source.is_file():
            raise ValueError(f'Missing source image: {source}')
    for destination in destinations:
        if any(destination.resolve() == source.resolve() or
               (destination.exists() and destination.samefile(source))
               for source in args.sources):
            raise ValueError(f'Output would overwrite a source image: {destination}')
        if destination.exists() and (not args.overwrite or not destination.is_file()):
            raise ValueError(f'Output exists: {destination}; use --overwrite to replace output files')

    def fit(canvas, shot, x, y, width, height):
        scale = min(width / shot.width, height / shot.height)
        size = (max(1, round(shot.width * scale)), max(1, round(shot.height * scale)))
        with shot.resize(size, Image.Resampling.LANCZOS) as resized:
            canvas.paste(resized, (x + (width - size[0]) // 2,
                                  y + (height - size[1]) // 2), resized)

    sheet_size = (args.cell_width * 3 + args.gap * 2,
                  args.cell_height * 3 + args.gap * 2)
    triptych_width = args.cell_width * 2
    triptych_cell_height = round(triptych_width / 2.39)
    with ExitStack() as stack:
        shots = []
        for source in args.sources:
            try:
                with Image.open(source) as original:
                    if getattr(original, 'n_frames', 1) != 1:
                        raise ValueError('Expected a single-frame still image')
                    original.load()
                    with ImageOps.exif_transpose(original) as oriented:
                        shot = stack.enter_context(oriented.convert('RGBA'))
                        shots.append(shot)
            except (OSError, ValueError, Image.DecompressionBombError) as exc:
                raise ValueError(f'Unable to read source image {source}: {exc}') from exc

        # Decode everything before producing outputs. Stage all PNGs before publishing.
        args.output_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.storyboard-', dir=args.output_dir) as temporary:
            staging = Path(temporary)
            for name, shot in zip(names[:9], shots):
                shot.save(staging / name, format='PNG')
            for group in range(3):
                size = (triptych_width, triptych_cell_height * 3 + args.gap * 2)
                with Image.new('RGB', size, 'black') as canvas:
                    for slot in range(3):
                        fit(canvas, shots[group * 3 + slot], 0,
                            slot * (triptych_cell_height + args.gap),
                            triptych_width, triptych_cell_height)
                    canvas.save(staging / names[9 + group], format='PNG')
            with Image.new('RGB', sheet_size, 'black') as canvas:
                for i, shot in enumerate(shots):
                    fit(canvas, shot, (i % 3) * (args.cell_width + args.gap),
                        (i // 3) * (args.cell_height + args.gap),
                        args.cell_width, args.cell_height)
                canvas.save(staging / names[-1], format='PNG')
            for name, destination in zip(names, destinations):
                (staging / name).replace(destination)
    return {'SourceCount': 9, 'ShotCount': 9, 'TriptychCount': 3,
            'ContactSheet': str(destinations[-1]),
            'ContactWidth': sheet_size[0], 'ContactHeight': sheet_size[1]}


def main():
    args = arguments()
    try:
        result = compose(args)
    except (OSError, ValueError) as exc:
        print(f'Error: {exc}', file=sys.stderr)
        return 1
    # ASCII-escaped JSON also works in legacy Windows console encodings.
    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == '__main__':
    sys.exit(main())
