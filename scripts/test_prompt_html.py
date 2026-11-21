"""File and escaping regressions; browser behavior is checked separately."""
import copy
import base64
import json
import tempfile
import unittest
from pathlib import Path
from build_prompt_html import build, render, relative_url, LOGO_PATH, TEMPLATE_PATH


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "完整提示词.txt").write_text('人物向左走。\n保留 <原画风> & "服装"。\n</pre><script>bad()</script>', encoding="utf-8")
        (self.root / "分镜 #1.png").write_bytes(b"test fixture, not visual evidence")
        self.plan = {"title": "山寺 <借伞>", "segments": [{"id": "S01", "title": "交接", "prompt_format": "自由格式", "prompt_file": "完整提示词.txt", "images": [{"path": "分镜 #1.png", "role": "尾态：已松手"}]}]}

    def tearDown(self):
        self.temp.cleanup()

    def test_complete_escaped_text_and_relative_media(self):
        page = render(self.plan, self.root, self.root)
        self.assertIn('人物向左走。\n保留 &lt;原画风&gt;', page)
        self.assertNotIn('<script>bad()</script>', page)
        self.assertIn('%20%231.png', page)
        self.assertNotIn(str(self.root), page)
        self.assertNotIn('<video ', page)
        self.assertIn('download="完整提示词.txt"', page)
        self.assertIn("new Blob([pre.textContent]", page)

    def test_reject_missing_remote_absolute_and_traversal(self):
        for name in ['../private.txt', 'https://example.com/key.txt', 'C:\\private.txt', '/private.txt', 'missing.txt']:
            with self.subTest(path=name):
                plan = copy.deepcopy(self.plan)
                plan['segments'][0]['prompt_file'] = name
                with self.assertRaises(ValueError):
                    render(plan, self.root, self.root)

    def test_relative_media_resolves_symlinked_output_directory(self):
        alias = self.root / '目录别名'
        try:
            alias.symlink_to(self.root, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest('当前环境不允许创建目录符号链接')
        self.assertEqual(relative_url(self.root / '分镜 #1.png', alias),
                         relative_url(self.root / '分镜 #1.png', self.root))

    def test_template_and_original_brand_asset_are_embedded(self):
        page = render(self.plan, self.root, self.root)
        self.assertTrue(TEMPLATE_PATH.is_file())
        logo = base64.b64encode(LOGO_PATH.read_bytes()).decode('ascii')
        self.assertIn('src="data:image/png;base64,' + logo + '"', page)
        self.assertIn('alt="FANTASY"', page)
        for marker in ['<!--TITLE-->', '<!--NAV-->', '<!--CONTENT-->', '<!--LOGO_DATA-->']:
            self.assertNotIn(marker, page)
        self.assertNotIn(str(LOGO_PATH), page)

    def test_demo_rebuild_uses_same_source_and_relative_assets(self):
        root = Path(__file__).resolve().parents[1] / 'examples'
        plan = json.loads((root / '工作台示例.json').read_text(encoding='utf-8'))
        actual = render(plan, root, root)
        shipped = (root / '分镜与提示词.html').read_text(encoding='utf-8')
        self.assertEqual(actual, shipped)
        self.assertIn('american-football-optical-pressure-triptych.jpg', actual)
        self.assertNotIn('<video ', actual)

    def test_reject_duplicates_and_invalid_structure(self):
        plan = copy.deepcopy(self.plan)
        plan['segments'].append(copy.deepcopy(plan['segments'][0]))
        with self.assertRaises(ValueError):
            render(plan, self.root, self.root)
        for plan in [[], {}, {"title": "test", "segments": []}]:
            with self.assertRaises(ValueError):
                render(plan, self.root, self.root)

    def test_default_rejects_incomplete_body_before_writing_output(self):
        del self.plan['segments'][0]['prompt_format']
        manifest = self.root / '交付清单.json'
        manifest.write_text(json.dumps(self.plan, ensure_ascii=False), encoding='utf-8')
        with self.assertRaises(ValueError):
            build(manifest)
        self.assertFalse((self.root / '分镜与提示词.html').exists())

    def test_text_only_and_no_overwrite(self):
        self.plan['segments'][0]['images'] = []
        manifest = self.root / "交付清单.json"
        manifest.write_text(json.dumps(self.plan, ensure_ascii=False), encoding="utf-8-sig")
        output = build(manifest)
        self.assertIn("本段未提供分镜图", output.read_text(encoding="utf-8"))
        with self.assertRaises(FileExistsError):
            build(manifest)
        build(manifest, force=True)
        with self.assertRaises(ValueError):
            build(manifest, manifest, force=True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
