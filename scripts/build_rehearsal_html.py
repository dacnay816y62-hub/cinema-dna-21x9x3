"""Build the offline FANTASY rehearsal workbench with Python 3.9+ stdlib."""
import argparse
import base64
import copy
import json
from pathlib import Path
import re
import uuid

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets' / 'storyboard-rehearsal'
SCHEMA = 'fantasy-director-board-v0.1'
JS = ['原图显示缓存.js', '运镜预设.js', '画布交互.js', '快捷交互.js',
      '拖动反馈.js', '素材库.js', '任务与提示词.js', '分组联动导航.js', '原图查看器.js']
CSS = ['界面精修.css', '任务与提示词.css', '分组联动导航.css', '原图查看器.css']


def encode(value):
    return json.dumps(value, ensure_ascii=False).replace('<', '\\u003c')


def blank_project(title='我的电影项目'):
    key = 'fantasy-rehearsal-' + str(uuid.uuid4())
    return {'schema': SCHEMA, 'media': {}, 'state': {
        'projectId': key, 'instanceId': key, 'title': title,
        'revision': 1, 'cols': 3, 'view': 'groups', 'nextGroup': 1, 'nextShot': 1,
        'shots': [], 'order': [], 'edges': {}, 'references': [],
        'groups': [{'id': 'A1', 'title': '第一个生成任务', 'color': '#d74736',
                    'members': [], 'inputMode': 'storyboard', 'mode': 'multi',
                    'referenceIds': [], 'referenceBindings': {}, 'duration': '',
                    'intent': '', 'bridge': '', 'promptText': '', 'promptSource': 'empty'}],
        'libraryFolders': [], 'libraryUI': {'folderId': 'all', 'closedFolders': [], 'search': ''},
        'taskLinks': [], 'log': [], 'humanReviewed': False,
        'confirmedRevision': None, 'requestedRevision': None}}


def validate_project(project):
    if project.get('schema') != SCHEMA:
        raise ValueError('请使用预演台导出的项目资料 JSON，不是旧版静态工作台清单。')
    state, media = project['state'], project['media']
    for field in ('projectId', 'instanceId', 'title'):
        if not isinstance(state.get(field), str) or not state[field]:
            raise ValueError('缺少项目字段：' + field)
    for field in ('shots', 'groups', 'references', 'order'):
        if not isinstance(state.get(field), list):
            raise ValueError('缺少项目列表：' + field)
    for field in ('shots', 'groups', 'references'):
        ids = [x['id'] for x in state[field]]
        if len(ids) != len(set(ids)):
            raise ValueError(field + ' 编号重复')
    shots = {s['id'] for s in state['shots']}
    refs = {r['id'] for r in state['references']}
    if len(state['order']) != len(set(state['order'])) or set(state['order']) != shots:
        raise ValueError('固定镜号与排序列表不一致')
    used = set()
    for group in state['groups']:
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', group.get('color', '')):
            raise ValueError('组色须为六位十六进制颜色')
        members = group.get('members', [])
        if len(members) != len(set(members)) or not set(members) <= shots or used.intersection(members):
            raise ValueError('组内镜号缺失、重复或被多个分镜组占用')
        used.update(members)
        if not set(group.get('referenceIds', [])) <= refs:
            raise ValueError('组内引用素材不存在')
    for item in state['shots'] + state['references']:
        if item.get('assetId') not in media:
            raise ValueError('素材丢失：' + item['id'])
    for item in media.values():
        data = item.get('data', '')
        if not re.fullmatch(r'data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+', data):
            raise ValueError('仅接受内嵌 PNG/JPEG/WebP 原图，不接受远程地址或可执行 SVG。')
        base64.b64decode(data.split(',', 1)[1], validate=True)


def prompt_basis(state, group):
    def pick(obj, fields):
        return {k: obj.get(k) if obj.get(k) is not None else '' for k in fields.split()}
    index = state['groups'].index(group)
    asset_mode = group.get('inputMode') == 'assets'
    ids = [sid for sid in state['order'] if sid in group['members']]
    shots = {s['id']: s for s in state['shots']}
    references = {r['id']: r for r in state['references']}
    bound = []
    for rid in group.get('referenceIds', []):
        ref, binding = references[rid], group.get('referenceBindings', {}).get(rid, {})
        current = dict(ref)
        for field in ('role', 'scope', 'exclude'):
            current[field] = binding.get(field) if binding.get(field) is not None else ref.get(field, '')
        current['note'] = binding.get('note') or ''
        bound.append(current)
    return {
        **pick(group, 'id inputMode mode duration visualStyle cameraPlan soundPlan startState endState'),
        'previous': state['groups'][index - 1]['id'] if index else '',
        'next': state['groups'][index + 1]['id'] if index + 1 < len(state['groups']) else '',
        'links': [e for e in state.get('taskLinks', []) if e.get('from') == group['id'] or e.get('to') == group['id']],
        'shots': [] if asset_mode else [pick(shots[sid], 'id title assetId assetVersion camera action continuity needsRevision') for sid in ids],
        'edges': [] if asset_mode else [state['edges'].get(a + '>>' + b) for a, b in zip(ids, ids[1:])],
        'references': [pick(r, 'id title assetId assetVersion role scope exclude note needsRevision') for r in bound]}


def apply_prompts(project, prompts):
    """Explicitly bind agent-written text to the exact exported project revision."""
    state = project['state']
    groups = {g['id']: g for g in state['groups']}
    if not isinstance(prompts, dict) or not prompts or set(prompts) - set(groups):
        raise ValueError('提示词 JSON 必须是现有组号到完整正文的映射。')
    for gid, text in prompts.items():
        if not isinstance(text, str) or not text.strip():
            raise ValueError(gid + ' 完整正文为空')
        groups[gid]['promptText'] = text
        groups[gid]['promptSource'] = 'agent'
        groups[gid]['promptBasis'] = prompt_basis(state, groups[gid])
    state['humanReviewed'] = False
    state['confirmedRevision'] = None
    state['requestedRevision'] = None
    state.pop('request', None)


def build(project, output, force=False):
    if output.exists() and not force:
        raise FileExistsError('目标已存在，请另存或明确使用 --force。')
    project = copy.deepcopy(project)
    validate_project(project)
    # 每个新构建都有独立保存键，防止旧浏览器缓存覆盖新正文；固定镜号与项目 ID 保留。
    project['state']['instanceId'] = 'fantasy-rehearsal-' + str(uuid.uuid4())
    logo = 'data:image/png;base64,' + base64.b64encode((ROOT / 'assets/fantasy-brand/fantasy-logo.png').read_bytes()).decode('ascii')
    values = {'__LOGO__': logo, '__BOOTSTRAP__': encode(project),
              '__PRESETS__': encode(json.loads((SOURCE / '转场预设.json').read_text(encoding='utf-8'))),
              '__UI_POLISH__': '\n'.join((SOURCE / name).read_text(encoding='utf-8') for name in CSS),
              '__APP__': '\n'.join((SOURCE / name).read_text(encoding='utf-8') for name in JS)}
    template = (SOURCE / '画布模板.html').read_text(encoding='utf-8')
    # 单次替换防止用户正文中出现模板标记时被误改。
    page = re.sub('|'.join(re.escape(k) for k in values), lambda m: values[m[0]], template)
    page = page.replace('<span class="muted">交互样板</span>', '<span class="muted">FANTASY · Beta 1</span>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding='utf-8')
    return output


def main():
    parser = argparse.ArgumentParser(description='构建可离线编辑、含原图的分镜预演台，不调用生成模型。')
    parser.add_argument('project', nargs='?', type=Path, help='预演台导出的项目 JSON；省略则创建空白项目')
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--title', default='我的电影项目', help='仅用于新建空白项目')
    parser.add_argument('--prompts', type=Path, help='可选：助手写好的 {"A1":"完整正文"} JSON')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    try:
        project = json.loads(args.project.read_text(encoding='utf-8-sig')) if args.project else blank_project(args.title)
        validate_project(project)
        if args.prompts:
            apply_prompts(project, json.loads(args.prompts.read_text(encoding='utf-8-sig')))
        result = build(project, args.output, args.force)
        print('已生成：' + str(result))
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, '构建失败：' + str(error) + '\n')


if __name__ == '__main__':
    main()
