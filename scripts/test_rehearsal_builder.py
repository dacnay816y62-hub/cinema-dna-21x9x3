import copy
import json
from pathlib import Path
import re
import tempfile
import unittest

import build_rehearsal_html as builder


class RehearsalBuilderTests(unittest.TestCase):
    def setUp(self):
        self.project = builder.blank_project('测试项目')

    def test_blank_and_independent_ids(self):
        builder.validate_project(self.project)
        self.assertNotEqual(self.project['state']['instanceId'], builder.blank_project()['state']['instanceId'])

    def test_inline_build_preserves_sources_and_escapes_user_text(self):
        self.project['state']['title'] = '</script>__APP__<script>not-code</script>'
        before = copy.deepcopy(self.project)
        with tempfile.TemporaryDirectory() as temp:
            output = builder.build(self.project, Path(temp) / '预演台.html')
            html = output.read_text(encoding='utf-8')
            payload = json.loads(re.search(r'<script id="bootstrap" type="application/json">(.*?)</script>', html, re.S)[1])
            self.assertEqual(payload['state']['title'], before['state']['title'])
            self.assertNotEqual(payload['state']['instanceId'], before['state']['instanceId'])
            self.assertEqual(self.project, before)
            self.assertNotIn('</script>__APP__<script>', html)
            self.assertIn('imageViewer', html)
            self.assertIn('promptGroupNav', html)
            self.assertNotRegex(html, r'<script[^>]+src=')
            with self.assertRaises(FileExistsError):
                builder.build(self.project, output)

    def test_duplicate_ids_rejected(self):
        self.project['state']['groups'] *= 2
        with self.assertRaises(ValueError):
            builder.validate_project(self.project)

    def test_css_injection_rejected(self):
        self.project['state']['groups'][0]['color'] = 'red; background:url(https://example.com)'
        with self.assertRaises(ValueError):
            builder.validate_project(self.project)

    def test_remote_media_rejected(self):
        self.project['media']['bad'] = {'data': 'https://example.com/private.png'}
        with self.assertRaises(ValueError):
            builder.validate_project(self.project)

    def test_missing_reference_rejected(self):
        self.project['state']['groups'][0]['referenceIds'] = ['missing']
        with self.assertRaises(ValueError):
            builder.validate_project(self.project)

    def test_prompt_binding_clears_review_but_not_other_groups(self):
        state = self.project['state']
        second = dict(state['groups'][0], id='B1', promptText='保留正文')
        state['groups'].append(second)
        state['humanReviewed'] = True
        builder.apply_prompts(self.project, {'A1': '实际完整中文正文'})
        self.assertFalse(state['humanReviewed'])
        self.assertEqual(state['groups'][0]['promptSource'], 'agent')
        self.assertEqual(state['groups'][0]['promptBasis']['next'], 'B1')
        self.assertEqual(second['promptText'], '保留正文')

    def test_unknown_group_and_empty_prompt_rejected(self):
        for prompts in ({'G1': '正文'}, {'A1': ''}, {}):
            with self.assertRaises(ValueError):
                builder.apply_prompts(self.project, prompts)

    def test_binding_note_matches_browser_not_global_reference(self):
        state = self.project['state']
        state['references'] = [{'id': 'ref', 'title': '参考', 'role': 'scene', 'note': '全局旧文字'}]
        group = state['groups'][0]
        group['referenceIds'] = ['ref']
        self.assertEqual(builder.prompt_basis(state, group)['references'][0]['note'], '')


if __name__ == '__main__':
    unittest.main()
