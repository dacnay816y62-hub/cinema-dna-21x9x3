/* 只操作浏览位置，不改镜号、编组、图片、正文或审核版本。 */
function seedreamRenderGroupNav() {
  const head = document.querySelector('.connection-sidebar .inspector-head');
  if (!head) return;
  let nav = document.getElementById('promptGroupNav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = 'promptGroupNav';
    nav.className = 'prompt-group-nav';
    nav.setAttribute('aria-label', '生成组快速切换，同步定位画布');
    const caption = document.createElement('div');
    caption.className = 'prompt-group-caption';
    caption.innerHTML = '<span>快速切换</span><span>同步定位画布</span>';
    const list = document.createElement('div');
    list.className = 'prompt-group-list';
    nav.append(caption, list);
    head.prepend(nav);
  }
  const list = nav.querySelector('.prompt-group-list');
  const existing = new Map([...list.children].map(button => [button.dataset.id, button]));
  const activeId = panel.type === 'group' ? panel.id : null;
  for (const [index, group] of state.groups.entries()) {
    let button = existing.get(group.id);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'prompt-group-tab';
      button.dataset.action = 'group-view';
      button.dataset.id = group.id;
      button.setAttribute('aria-controls', 'inspector board');
      const dot = document.createElement('i');
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('b');
      button.append(dot, label);
    }
    button.querySelector('b').textContent = group.id;
    button.style.setProperty('--group', group.color);
    const description = group.id + ' · ' + (group.title || '生成任务');
    button.title = description + ' — 查看提示词并定位图片';
    button.setAttribute('aria-label', description);
    button.classList.toggle('active', group.id === activeId);
    if (group.id === activeId) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
    // 复用按钮节点，正文重绘不会丢失键盘焦点。
    if (list.children[index] !== button) list.insertBefore(button, list.children[index] || null);
    existing.delete(group.id);
  }
  existing.forEach(button => button.remove());
  nav.hidden = state.groups.length === 0;
  document.querySelectorAll('#groups .group-chip').forEach(button => {
    const active = button.dataset.id === activeId;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}

let seedreamGroupNavFrame = 0;
function seedreamNavigateGroup(id) {
  if (!state.groups.some(group => group.id === id)) return;
  // 先提交旧检查器中尚未失焦的字段，再改变编辑对象。
  if (document.getElementById('inspector')?.contains(document.activeElement)) document.activeElement.blur();
  panel = {type: 'group', id};
  const changedView = state.view !== 'groups';
  state.view = 'groups';
  renderBoard();
  renderInspector();
  if (changedView) scheduleSave();
  cancelAnimationFrame(seedreamGroupNavFrame);
  seedreamGroupNavFrame = requestAnimationFrame(() => {
    if (panel.type !== 'group' || panel.id !== id) return;
    const section = [...document.querySelectorAll('#board .group-section[data-group]')]
      .find(element => element.dataset.group === id);
    if (!section) return;
    const header = document.querySelector('body > header');
    const stickyHeader = header && ['sticky', 'fixed'].includes(getComputedStyle(header).position);
    const offset = stickyHeader ? header.getBoundingClientRect().height : 0;
    // 长篇画布用即时定位，避免跨越数屏的滑行；组框短暂亮边提示落点。
    window.scrollTo({top: Math.max(0, window.scrollY + section.getBoundingClientRect().top - offset - 16), behavior: 'instant'});
    section.classList.remove('group-nav-arrived');
    void section.offsetWidth;
    section.classList.add('group-nav-arrived');
    const sidebar = document.querySelector('.connection-sidebar');
    const prompt = document.querySelector('#inspector .group-prompt-field');
    const head = sidebar?.querySelector('.inspector-head');
    if (sidebar && prompt && head && getComputedStyle(sidebar).position === 'sticky') {
      const top = sidebar.scrollTop + prompt.getBoundingClientRect().top
        - sidebar.getBoundingClientRect().top - head.getBoundingClientRect().height - 16;
      sidebar.scrollTo({top: Math.max(0, top), behavior: 'instant'});
    }
    let status = document.getElementById('groupNavStatus');
    if (!status) {
      status = document.createElement('div');
      status.id = 'groupNavStatus';
      status.className = 'group-nav-status';
      status.setAttribute('role', 'status');
      document.body.append(status);
    }
    status.textContent = '已切换至 ' + id + '，画布图片与完整提示词已同步。';
  });
}

const seedreamNavOriginalBoard = renderBoard;
renderBoard = function() {
  seedreamNavOriginalBoard();
  seedreamRenderGroupNav();
};
const seedreamNavOriginalInspector = renderInspector;
renderInspector = function() {
  seedreamNavOriginalInspector();
  seedreamRenderGroupNav();
};
