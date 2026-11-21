"""拼版像素/文件回归；不评估分镜内容的艺术质量。"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from PIL import Image
from compose_nine_shot_storyboard import compose


SCRIPTS = Path(__file__).resolve().parent
COLORS = [(220, 20, 20), (20, 220, 20), (20, 20, 220),
          (220, 220, 20), (220, 20, 220), (20, 220, 220),
          (100, 100, 100), (160, 80, 20), (80, 20, 160)]


class StoryboardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='storyboard-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / '中文 空格 [素材]'
        self.root.mkdir()
        self.sources = []
        for index, color in enumerate(COLORS):
            path = self.root / f'镜头 {index + 1:02d}.png'
            with Image.new('RGB', (80, 80), color) as image:
                image.save(path)
            self.sources.append(path)
        self.output = self.root / '交付 空格'

    def assert_delivery(self, output, result, cell_width=320, cell_height=134, gap=8):
        self.assertEqual(result['SourceCount'], 9)
        self.assertEqual(result['ShotCount'], 9)
        self.assertEqual(result['TriptychCount'], 3)
        self.assertEqual(len(list(output.iterdir())), 13)
        self.assertEqual(result['ContactWidth'], cell_width * 3 + gap * 2)
        self.assertEqual(result['ContactHeight'], cell_height * 3 + gap * 2)
        with Image.open(result['ContactSheet']) as sheet:
            self.assertEqual(sheet.size, (result['ContactWidth'], result['ContactHeight']))
            for index, color in enumerate(COLORS):
                x = (index % 3) * (cell_width + gap)
                y = (index // 3) * (cell_height + gap)
                self.assertEqual(sheet.getpixel((x + cell_width // 2, y + cell_height // 2))[:3], color)
                # Square sources stay square, centered with black left/right bars.
                self.assertEqual(sheet.getpixel((x + 1, y + cell_height // 2))[:3], (0, 0, 0))
            if gap:
                self.assertEqual(sheet.getpixel((cell_width + gap // 2, cell_height // 2))[:3], (0, 0, 0))
        triptych_width = cell_width * 2
        height = round(triptych_width / 2.39)
        for group in range(3):
            with Image.open(output / f'demo_triptych_{group + 1}.png') as image:
                self.assertEqual(image.size, (triptych_width, height * 3 + gap * 2))
                for slot in range(3):
                    self.assertEqual(image.getpixel((triptych_width // 2, slot * (height + gap) + height // 2))[:3], COLORS[group * 3 + slot])
        for index, source in enumerate(self.sources):
            self.assertEqual(source.read_bytes(), (output / f'demo_shot{index + 1:02d}.png').read_bytes())

    def test_defaults_order_dimensions_and_source_preservation(self):
        result = compose(self.sources, self.output, 'demo')
        self.assert_delivery(self.output, result, 960, 402)

    def test_custom_cells_and_zero_gap(self):
        result = compose(self.sources, self.output, 'demo', 321, 200, 0)
        self.assert_delivery(self.output, result, 321, 200, 0)

    def test_python_cli_with_unicode_and_spaces(self):
        run = subprocess.run([sys.executable, str(SCRIPTS / 'compose_nine_shot_storyboard.py'),
                              '--sources', *map(str, self.sources), '--output-dir', str(self.output),
                              '--prefix', 'demo', '--cell-width', '320', '--cell-height', '134'],
                             capture_output=True, text=True, encoding='utf-8', timeout=90)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assert_delivery(self.output, json.loads(run.stdout))

    def test_invalid_inputs_leave_existing_delivery_unchanged(self):
        compose(self.sources, self.output, 'demo', 320, 134)
        before = {p.name: p.read_bytes() for p in self.output.iterdir()}
        bad = self.root / '坏图.png'
        bad.write_bytes(b'not an image')
        cases = [self.sources[:8], self.sources + [self.sources[0]],
                 self.sources[:8] + [self.root / '不存在.png'], self.sources[:8] + [bad]]
        for sources in cases:
            with self.subTest(sources=sources), self.assertRaises(ValueError):
                compose(sources, self.output, 'demo', 320, 134)
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.output.iterdir()})

    def test_reject_invalid_parameters_before_creating_output(self):
        for kwargs in [{'prefix': '../escape'}, {'cell_width': 0}, {'cell_height': 1608}, {'gap': -1}]:
            settings = dict(prefix='demo', cell_width=320, cell_height=134)
            settings.update(kwargs)
            with self.subTest(settings=settings), self.assertRaises(ValueError):
                compose(self.sources, self.output, **settings)
        self.assertFalse(self.output.exists())

    def test_no_source_overwrite(self):
        target = self.root / 'demo_shot01.png'
        shutil.copy2(self.sources[0], target)
        original = target.read_bytes()
        with self.assertRaisesRegex(ValueError, '覆盖源图'):
            compose([target] + self.sources[1:], self.root, 'demo', 320, 134)
        self.assertEqual(target.read_bytes(), original)
        self.assertFalse((self.root / 'demo_triptych_1.png').exists())

    def test_jpeg_orientation_and_real_png_export(self):
        jpeg = self.root / '竖向照片.jpg'
        with Image.new('RGB', (80, 40), 'red') as image:
            exif = Image.Exif()
            exif[274] = 6
            image.save(jpeg, exif=exif)
        before = jpeg.read_bytes()
        compose([jpeg] + self.sources[1:], self.output, 'demo', 320, 134)
        with Image.open(self.output / 'demo_shot01.png') as image:
            self.assertEqual(image.format, 'PNG')
            self.assertEqual(image.size, (40, 80))
        self.assertEqual(jpeg.read_bytes(), before)

    def test_transparency_is_composited_on_black(self):
        with Image.new('RGBA', (80, 80), (200, 100, 50, 128)) as image:
            image.save(self.sources[0])
        result = compose(self.sources, self.output, 'demo', 320, 134)
        with Image.open(result['ContactSheet']) as image:
            self.assertEqual(image.getpixel((160, 67)), (100, 50, 25))

    def test_missing_pillow_has_actionable_error(self):
        run = subprocess.run([sys.executable, '-S', str(SCRIPTS / 'compose_nine_shot_storyboard.py'),
                              '--sources', *map(str, self.sources), '--output-dir', str(self.output), '--prefix', 'demo'],
                             capture_output=True, text=True, encoding='utf-8',
                             env=dict(os.environ, PYTHONUTF8='1', PYTHONPATH=''), timeout=30)
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('缺少 Pillow', run.stderr)
        self.assertNotIn('Traceback', run.stderr)
        self.assertFalse(self.output.exists())

    def run_powershell(self, explicit_python=False, bad_source=False):
        pwsh = shutil.which('pwsh')
        if not pwsh:
            if os.environ.get('CI'):
                self.fail('CI 必须安装 PowerShell，不能跳过跨平台入口测试。')
            self.skipTest('本机没有 PowerShell；CI 必须验证此入口。')
        sources = list(self.sources)
        if bad_source:
            sources[-1] = self.root / '坏图.png'
            sources[-1].write_bytes(b'corrupt')
        env = dict(os.environ, TEST_SOURCES=json.dumps(list(map(str, sources))),
                   TEST_OUTPUT=str(self.output), TEST_PYTHON=sys.executable,
                   TEST_SCRIPT=str(SCRIPTS / 'compose-nine-shot-storyboard.ps1'))
        command = "$ErrorActionPreference='Stop'; $paths=@($env:TEST_SOURCES | ConvertFrom-Json); "
        command += "& $env:TEST_SCRIPT -Sources $paths -OutputDir $env:TEST_OUTPUT -Prefix demo -CellWidth 320 -CellHeight 134"
        if explicit_python:
            command += ' -PythonExecutable $env:TEST_PYTHON'
        command += ' | ConvertTo-Json -Compress'
        return subprocess.run([pwsh, '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
                              capture_output=True, text=True, encoding='utf-8', env=env, timeout=90)

    def test_powershell_platform_default(self):
        run = self.run_powershell()
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assert_delivery(self.output, json.loads(run.stdout))

    def test_powershell_explicit_python(self):
        run = self.run_powershell(explicit_python=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assert_delivery(self.output, json.loads(run.stdout))

    def test_powershell_native_shell_file_arguments(self):
        pwsh = shutil.which('pwsh')
        if not pwsh:
            if os.environ.get('CI'):
                self.fail('CI 必须安装 PowerShell。')
            self.skipTest('本机没有 PowerShell。')
        # Issue #2 的 bash/zsh 传参方式：9 个独立路径，不是逗号拼接的字符串。
        run = subprocess.run([pwsh, '-NoLogo', '-NoProfile', '-NonInteractive',
                              '-File', str(SCRIPTS / 'compose-nine-shot-storyboard.ps1'),
                              '-Sources', *map(str, self.sources),
                              '-OutputDir', str(self.output), '-Prefix', 'demo',
                              '-CellWidth', '320', '-CellHeight', '134'],
                             capture_output=True, text=True, encoding='utf-8', timeout=90)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assert_delivery(self.output, {
            'SourceCount': 9, 'ShotCount': 9, 'TriptychCount': 3,
            'ContactWidth': 976, 'ContactHeight': 418,
            'ContactSheet': str(self.output / 'demo_3x3_contact_sheet.png'),
        })

    def test_powershell_propagates_backend_failure(self):
        run = self.run_powershell(explicit_python=True, bad_source=True)
        self.assertNotEqual(run.returncode, 0)
        self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
