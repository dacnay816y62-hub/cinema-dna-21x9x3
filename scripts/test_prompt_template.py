"""固定交付格式的缺漏回归，不代表模型性能测试。"""
import unittest
from pathlib import Path
from check_prompt_template import HEADINGS, validate_prompt

ROOT = Path(__file__).resolve().parents[1]


class PromptTemplateTests(unittest.TestCase):
    def setUp(self):
        self.prompt = (ROOT / 'examples/中文提示词示例/檐下递灯.txt').read_text(encoding='utf-8')

    def test_completed_examples_pass(self):
        validate_prompt(self.prompt)
        validate_prompt((ROOT / 'examples/工作台示例/完整视频提示词.txt').read_text(encoding='utf-8'))

    def test_blank_authoring_template_cannot_be_delivered_as_final(self):
        blank = (ROOT / 'assets/提示词模板/完整视频提示词模板.txt').read_text(encoding='utf-8')
        with self.assertRaises(ValueError):
            validate_prompt(blank)

    def test_omitted_or_empty_sections_are_rejected(self):
        for heading in HEADINGS:
            marker = '【' + heading + '】'
            start = self.prompt.index(marker)
            end = self.prompt.find('\n【', start + len(marker))
            end = len(self.prompt) if end == -1 else end
            for replacement in ['', marker + '\n', marker + '\n同上\n']:
                with self.subTest(heading=heading, replacement=replacement):
                    with self.assertRaises(ValueError):
                        validate_prompt(self.prompt[:start] + replacement + self.prompt[end:])

    def test_unfilled_and_english_content_are_rejected(self):
        for extra in ['\n〔填写：动作〕', '\n其他同上', '\nCamera: dolly in', '\nＣＡＭＥＲＡ']:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                validate_prompt(self.prompt + extra)

    def test_user_format_requires_explicit_selection(self):
        custom = '保持原图，人物放下杯子，镜头固定。'
        with self.assertRaises(ValueError):
            validate_prompt(custom)
        validate_prompt(custom, '自由格式')
        with self.assertRaises(ValueError):
            validate_prompt(custom, '错误格式')
        with self.assertRaises(ValueError):
            validate_prompt('', '自由格式')


if __name__ == '__main__':
    unittest.main(verbosity=2)
