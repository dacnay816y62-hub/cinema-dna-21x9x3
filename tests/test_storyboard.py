import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/compose-nine-shot-storyboard.py'


class StoryboardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.sources = []
        self.colors = [(20 + i * 20, 40, 80) for i in range(9)]
        for i, color in enumerate(self.colors):
            path = self.root / f'镜头 {i + 1}.png'
            with Image.new('RGB', (239, 100), color) as im:
                im.save(path)
            self.sources.append(path)
        self.output = self.root / '输出 files'

    def run_script(self, extra=(), sources=None):
        return subprocess.run([sys.executable, str(SCRIPT), '--sources',
                               *map(str, self.sources if sources is None else sources),
                               '--output-dir', str(self.output), '--prefix', 'test', *extra],
                              capture_output=True, text=True)

    def test_layout_order_sizes_and_rerun(self):
        before = [p.read_bytes() for p in self.sources]
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['ShotCount'], 9)
        self.assertEqual(len(list(self.output.glob('*.png'))), 13)
        with Image.open(self.output / 'test_3x3_contact_sheet.png') as im:
            self.assertEqual(im.size, (2896, 1222))
            for i, color in enumerate(self.colors):
                self.assertEqual(im.getpixel(((i % 3) * 968 + 480, (i // 3) * 410 + 201)), color)
            self.assertEqual(im.getpixel((962, 200)), (0, 0, 0))
        for group in range(3):
            with Image.open(self.output / f'test_triptych_{group + 1}.png') as im:
                self.assertEqual(im.size, (1920, 2425))
                for slot in range(3):
                    self.assertEqual(im.getpixel((960, slot * 811 + 401)), self.colors[group * 3 + slot])
        self.assertNotEqual(self.run_script().returncode, 0)
        self.assertEqual(self.run_script(['--overwrite']).returncode, 0)
        self.assertEqual(before, [p.read_bytes() for p in self.sources])

    def test_mixed_inputs_transparency_and_fit(self):
        jpeg = self.root / 'portrait.jpg'
        with Image.new('RGB', (100, 200), 'white') as im:
            exif = Image.Exif(); exif[274] = 6
            im.save(jpeg, exif=exif)
        self.sources[0] = jpeg
        with Image.new('RGBA', (100, 200), (255, 0, 0, 128)) as im:
            im.save(self.sources[1])
        result = self.run_script(['--cell-width', '320', '--cell-height', '134', '--gap', '0'])
        self.assertEqual(result.returncode, 0, result.stderr)
        with Image.open(self.output / 'test_shot01.png') as im:
            self.assertEqual(im.format, 'PNG'); self.assertEqual(im.size, (200, 100))
        with Image.open(self.output / 'test_3x3_contact_sheet.png') as im:
            self.assertEqual(im.size, (960, 402))
            self.assertEqual(im.getpixel((321, 67)), (0, 0, 0))
            self.assertEqual(im.getpixel((480, 67)), (128, 0, 0))

    def test_invalid_inputs_write_nothing(self):
        for extra in (['--gap', '-1'], ['--cell-width', '319'], ['--prefix', '../bad']):
            self.assertNotEqual(self.run_script(extra).returncode, 0)
        self.assertNotEqual(self.run_script(sources=self.sources[:8]).returncode, 0)
        self.assertNotEqual(self.run_script(sources=self.sources + self.sources[:1]).returncode, 0)
        self.sources[-1].write_bytes(b'not an image')
        self.assertNotEqual(self.run_script().returncode, 0)
        self.assertFalse(self.output.exists())
        self.sources[-1].unlink()
        self.assertNotEqual(self.run_script().returncode, 0)
        self.assertFalse(self.output.exists())

    def test_never_overwrites_source_even_with_flag(self):
        self.output.mkdir()
        collision = self.output / 'test_shot01.png'
        collision.write_bytes(self.sources[0].read_bytes())
        self.sources[0] = collision
        before = collision.read_bytes()
        result = self.run_script(['--overwrite'])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('source image', result.stderr)
        self.assertEqual(collision.read_bytes(), before)

    def test_legacy_console_encoding(self):
        command = [sys.executable, str(SCRIPT), "--sources", *map(str, self.sources),
                   "--output-dir", str(self.output), "--prefix", "test"]
        result = subprocess.run(command, capture_output=True, text=True,
                                env={**os.environ, "PYTHONIOENCODING": "ascii"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["ContactSheet"],
                         str(self.output / "test_3x3_contact_sheet.png"))

    def test_help_and_missing_dependency(self):
        result = subprocess.run([sys.executable, '-S', str(SCRIPT), '--help'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        result = subprocess.run([sys.executable, '-S', str(SCRIPT), '--sources', *map(str, self.sources),
                                 '--output-dir', str(self.output), '--prefix', 'test'], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Pillow is required', result.stderr)
        self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
