"""File and escaping regressions; browser behavior is checked separately."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
from build_prompt_html import build, render


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "完整提示词.txt").write_text('人物向左走。\n保留 <原画风> & "服装"。\n</pre><script>bad()</script>', encoding="utf-8")
        (self.root / "分镜 #1.png").write_bytes(b"test fixture, not visual evidence")
        self.plan = {"title": "山寺 <借伞>", "segments": [{"id": "S01", "title": "交接", "prompt_file": "完整提示词.txt", "images": [{"path": "分镜 #1.png", "role": "尾态：已松手"}]}]}

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

    def test_reject_missing_remote_absolute_and_traversal(self):
        for name in ['../private.txt', 'https://example.com/key.txt', 'C:\\private.txt', '/private.txt', 'missing.txt']:
            with self.subTest(path=name):
                plan = copy.deepcopy(self.plan)
                plan['segments'][0]['prompt_file'] = name
                with self.assertRaises(ValueError):
                    render(plan, self.root, self.root)

    def test_reject_duplicates_and_invalid_structure(self):
        plan = copy.deepcopy(self.plan)
        plan['segments'].append(copy.deepcopy(plan['segments'][0]))
        with self.assertRaises(ValueError):
            render(plan, self.root, self.root)
        for plan in [[], {}, {"title": "test", "segments": []}]:
            with self.assertRaises(ValueError):
                render(plan, self.root, self.root)

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
