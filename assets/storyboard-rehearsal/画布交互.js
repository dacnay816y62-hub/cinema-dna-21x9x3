'use strict';
const BOOT = JSON.parse(document.getElementById('bootstrap').textContent);
const PRESETS = JSON.parse(document.getElementById('preset-data').textContent);
// 兼容旧项目的预设目录：只更新显示文案，不改已保存的转场类型或切点。
const quickCut = PRESETS.visual.find(p=>p.id==='cut');
if(quickCut){quickCut.name='快切';quickCut.summary='直接切入下一镜，不加过渡特效；表演节奏仍按剧情，不强制加速。';quickCut.instruction='上一镜在指定切出点结束，下一镜直接从指定起始状态进入，不加过渡特效，不强制加快表演节奏。';}
let state = structuredClone(BOOT.state), media = {...BOOT.media}, selection = new Set();
let panel = {type:'edge', key:'01-01>>01-02'}, undoStack = [], db = null, saveTimer;
let uploadTarget = null, dragging = null, pendingUploads = 0, toastTimer, junctionFrame, modalReturnEdgeKey=null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now()+'-'+Math.random().toString(36).slice(2);
const pairKey = (a,b) => a+'>>'+b;
const shot = id => state.shots.find(s=>s.id===id);
const imageOf = seedreamDisplayImage;
const groupOf = id => state.groups.find(g=>g.members.includes(id));
const members = g => state.order.filter(id=>g.members.includes(id));
const assetMode = g => g?.inputMode==='assets';
const refAsset = id => (state.references||[]).find(r=>r.id===id);
const refs = g => (g.referenceIds||[]).map(id=>boundReference(g,id)).filter(Boolean);
const roles = [{id:'unknown',name:'请选择职责'},{id:'character',name:'人物资产'},{id:'scene',name:'场景资产'},{id:'prop',name:'道具资产'},{id:'style',name:'画风参考'},{id:'storyboard',name:'分镜参考'}];
const roleRules = {
  character:['锁定此角色的面容、体型、发型与服装，出场动作由剧情决定。','不继承定妆图背景、姿势、机位和景别，不自动成为开场画面。'],
  scene:['锁定可见空间、建筑结构、材质与物体相对位置。','不继承场景图中的无关人物；未知空间不可凭空当作已确认布局。'],
  prop:['锁定道具的形状、材质、颜色和结构。','持有人、数量及开合状态由本组剧情明确，不因参考图重置。'],
  style:['仅参考画风、用光、色调及材质表现。','不复制参考图人物、故事事件或具体构图。'],
  storyboard:['参考此画面的构图和人物空间关系；具体用途由本组剧情补充。','不默认首帧、尾帧，也不按上传顺序自动安排镜头。']
};
function ensureModel(){
  state.references||=[];state.nextReference||=1;
  [...state.shots,...state.references].forEach(item=>{item.needsRevision??=false;});
  state.shots.forEach(item=>{if(!item.camera?.trim())item.camera=DEFAULT_CAMERA;});
  state.groups.forEach(g=>{g.inputMode||='storyboard';g.referenceIds||=[];g.referenceBindings||={};for(const k of ['visualStyle','cameraPlan','soundPlan','endState'])g[k]||='';});
  state.groups.forEach(ensureGroupPrompt);
  ensureGroupIdentity();
  ensureLibraryModel();
}
// 正文是当前编辑内容；旧 intent / bridge 只做兼容存档，不再作为另一份并行指令。
let groupPromptEdit=null,groupPromptResizeFrame;
function groupPromptText(g){return typeof g.promptText==='string'?g.promptText:[g.intent,g.bridge].filter(t=>typeof t==='string'&&t.trim()).join('\n\n');}
function ensureGroupPrompt(g){
  if(typeof g.promptText!=='string'){g.promptText=groupPromptText(g);g.promptSource=g.promptText?'legacy':'empty';}
  if(!['legacy','empty','edited','agent'].includes(g.promptSource))g.promptSource=g.promptText?'edited':'empty';
}
function groupPromptStatus(g){return !groupPromptText(g).trim()?'待填写 / 待生成':g.promptSource==='legacy'?'原剧情草稿 · 待生成':g.promptSource==='agent'?'完整正文已回填 · 待核对':'正文已编辑 · 待核对';}
function groupPromptField(g){
  return `<section class="group-prompt-field field"><div class="prompt-heading"><label for="groupPrompt">完整视频提示词</label><span id="groupPromptCount">${Array.from(groupPromptText(g)).length} 字</span></div><div id="groupPromptStatus" class="prompt-status">${groupPromptStatus(g)}</div><textarea id="groupPrompt" data-group-prompt="${esc(g.id)}" class="complete-prompt" rows="14" spellcheck="false" aria-describedby="groupPromptHelp" placeholder="生成前可在这里写整段剧情要求。生成后，将本组完整的中文视频提示词回填到这里；不拆分、不省略。">${esc(groupPromptText(g))}</textarea><p id="groupPromptHelp" class="note">一组一份完整正文 · 随内容展开 · 编辑自动保存</p></section>`;
}
function sizeGroupPrompt(){
  cancelAnimationFrame(groupPromptResizeFrame);groupPromptResizeFrame=requestAnimationFrame(()=>{
    const el=$('groupPrompt');if(!el)return;el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px';
  });
}
function updateGroupPrompt(el){
  const g=state.groups.find(g=>g.id===el.dataset.groupPrompt);if(!g||g.promptText===el.value){sizeGroupPrompt();return;}
  if(groupPromptEdit?.element!==el||groupPromptEdit?.revision!==state.revision){
    undoStack.push(structuredClone(state));if(undoStack.length>8)undoStack.shift();
    state.revision++;state.log.push({revision:state.revision,label:'编辑 '+g.id+' 的完整正文',time:new Date().toISOString()});state.log=state.log.slice(-60);
    groupPromptEdit={element:el,revision:state.revision};
  }
  g.promptText=el.value;g.promptSource=g.promptText.trim()?'edited':'empty';invalidate();
  clearTimeout(saveTimer);$('saveStatus').textContent='正在保存…';saveTimer=setTimeout(()=>{saveTimer=null;saveNow();},300);renderGate();
  $('groupPromptStatus').textContent=groupPromptStatus(g);$('groupPromptCount').textContent=Array.from(g.promptText).length+' 字';sizeGroupPrompt();
}
function shotIsActive(id){return !assetMode(groupOf(id));}
function edgeIsActive(e){if(!e||!shotIsActive(e.from)||!shotIsActive(e.to))return false;const a=groupOf(e.from),b=groupOf(e.to);return !a||!b||a.id===b.id||state.groups.indexOf(b)===state.groups.indexOf(a)+1;}
// 高辨识度分组色：操作按钮仍为黑色，朱红保留。
const palette = ['#d74736','#25d183','#478cff','#f4c145','#ae6fff','#23cadb','#f161b2','#ff9648','#b7dd43','#7475ff','#21b7ac','#ebd33b'];
const colorNames = ['朱红','翡翠绿','亮蓝','琥珀黄','亮紫','湖青','玫红','橙色','青柠','靛蓝','碧青','柠黄'];
const legacyGroupColors = {'#438b68':'#25d183','#6388b0':'#478cff','#b18c4f':'#f4c145','#9676a7':'#ae6fff','#9fa3a7':'#23cadb'};
function groupLetterIndex(id){
  const letters=String(id).match(/^[A-Z]+/i)?.[0].toUpperCase();
  return letters?[...letters].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1:-1;
}
function ensureGroupIdentity(){
  // 同时覆盖初次打开、已有浏览器存档和旧版导入；仅迁移旧默认色，自定义色保留。
  if(state.groupColorVersion!==2){
    state.groups.forEach(g=>{g.color=legacyGroupColors[g.color.toLowerCase()]||g.color;});
    state.groupColorVersion=2;
  }
  state.usedGroupColors=[...new Set([...(Array.isArray(state.usedGroupColors)?state.usedGroupColors:[]),...state.groups.map(g=>g.color)].filter(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)).map(c=>c.toLowerCase()))];
  state.nextGroup=Math.max(Number.isInteger(state.nextGroup)?state.nextGroup:0,...state.groups.map(g=>groupLetterIndex(g.id)+1));
}
function reserveGroupId(id){state.nextGroup=Math.max(state.nextGroup,groupLetterIndex(id)+1);}
function suggestGroupColor(){
  const used=new Set([...(state.usedGroupColors||[]),...state.groups.map(g=>g.color)].map(c=>c.toLowerCase()));
  const presetColor=palette.find(c=>!used.has(c));if(presetColor)return presetColor;
  // 色卡用完后寻找与现有组差异较大的鲜明色，不循环复用色值。
  const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
  const active=[...used].map(rgb);
  const colorAt=(h,s,l)=>{
    const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};
    return '#'+f(0)+f(8)+f(4);
  };
  let best='',score=-1;
  for(const lightness of [.55,.66,.45])for(let hue=0;hue<360;hue+=3){
    const c=colorAt(hue,.78,lightness);if(used.has(c))continue;
    const v=rgb(c),distance=Math.min(...active.map(a=>v.reduce((n,x,i)=>n+(x-a[i])**2,0)),Infinity);
    if(distance>score){best=c;score=distance;}
  }
  if(best)return best;
  // 极端长项目的最终兜底：仍保证精确色值不重复。
  for(let i=0;i<0xffffff;i++){const c='#'+((i*2654435761)>>>0).toString(16).slice(-6).padStart(6,'0');if(!used.has(c))return c;}
  throw Error('可用组色已用尽。');
}
function newGroupColorOptions(){
  const chosen=suggestGroupColor(),colors=palette.includes(chosen)?palette:[...palette,chosen];
  return colors.map((c,i)=>'<option value="'+c+'" '+(c===chosen?'selected':'')+'>'+(colorNames[i]||'自动新色')+'</option>').join('');
}
const preset = id => PRESETS.visual.find(p=>p.id===id) || PRESETS.visual[0];
function defaultEdge(a,b){return {from:a,to:b,visual:'cut',audio:'sync',out:'',in:'',bridge:'',match:'',timing:'',sound:'',note:''};}
function pairs(){
  const map = new Map();
  const add = ids => ids.slice(1).forEach((b,i)=>{if(edgeIsActive({from:ids[i],to:b}))map.set(pairKey(ids[i],b),[ids[i],b]);});
  add(state.order); state.groups.filter(g=>!assetMode(g)).forEach(g=>add(members(g))); return [...map];
}
function ensureEdges(){for(const [key,[a,b]] of pairs()) if(!state.edges[key]) state.edges[key]=defaultEdge(a,b);}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',4000);}
function modal(html){$('modalContent').innerHTML=html;const title=$('modalContent').querySelector('h2');if(title){title.id='modalTitle';$('modal').setAttribute('aria-labelledby','modalTitle');$('modal').removeAttribute('aria-label');}else{$('modal').removeAttribute('aria-labelledby');$('modal').setAttribute('aria-label','预演台操作');}if(!$('modal').open)$('modal').showModal();}
function closeModal(){$('modal').close();}
function invalidate(){
  if(state.request){state.requestHistory=(state.requestHistory||[]).concat({失效原因:'分镜内容或确认状态变化',任务:state.request}).slice(-12);state.request=null;}
  state.confirmedRevision=null;state.requestedRevision=null;state.humanReviewed=false;
}
function record(label,fn,keepInspector=false){
  undoStack.push(structuredClone(state));if(undoStack.length>8)undoStack.shift();
  fn();state.revision++;invalidate();
  state.log.push({revision:state.revision,label,time:new Date().toISOString()});state.log=state.log.slice(-60);
  ensureModel();selection=new Set([...selection].filter(shotIsActive));ensureEdges();scheduleSave();render(keepInspector);
}
function snapshot(){return {schema:'fantasy-director-board-v0.1',state:structuredClone(state),media:{...media}};}
async function openDB(){
  return new Promise((resolve,reject)=>{const r=indexedDB.open('fantasy-director-board-v01',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
async function saveNow(){
  if(!db){$('saveStatus').textContent='本地存储不可用，请导出 HTML 保留修改';return;}
  const payload=snapshot();
  return new Promise(resolve=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(payload,state.instanceId);tx.oncomplete=()=>{$('saveStatus').textContent='本机已保存 · 迁移前请导出';resolve(true);};tx.onerror=()=>{$('saveStatus').textContent='保存失败，请立即导出 HTML';resolve(false);};});
}
function scheduleSave(){clearTimeout(saveTimer);$('saveStatus').textContent='正在保存…';saveNow();}
function options(list,value){return list.map(o=>`<option value="${esc(o.id)}" ${value===o.id?'selected':''}>${esc(o.name)}</option>`).join('');}
function field(label,key,value,type='textarea'){
  return `<div class="field"><label for="edit-${key}">${esc(label)}</label>${type==='input'?`<input id="edit-${key}" data-field="${key}" value="${esc(value)}">`:`<textarea id="edit-${key}" data-field="${key}">${esc(value)}</textarea>`}</div>`;
}
function edgeButton(key){const e=state.edges[key];if(!edgeIsActive(e))return '';return `<button class="edge-button ${panel.type==='edge'&&panel.key===key?'active':''}" data-action="edge" data-key="${esc(key)}"><span>${esc(preset(e.visual).name)}</span><span class="edge-arrow">→ ${esc(e.to)}</span></button>`;}
function junctionButton(key){
  const e=state.edges[key];if(!edgeIsActive(e))return '';
  return `<button class="edge-junction ${panel.type==='edge'&&panel.key===key?'active':''}" data-board-edge="${esc(key)}" data-action="choose-edge" data-key="${esc(key)}" title="${esc(e.from)} → ${esc(e.to)} · ${esc(preset(e.visual).name)} · 点击设置转场" aria-label="设置 ${esc(e.from)} 到 ${esc(e.to)} 的转场：${esc(preset(e.visual).name)}" aria-haspopup="dialog"><span class="junction-name">${esc(preset(e.visual).name)}</span><span class="junction-chevron" aria-hidden="true">⌄</span><span class="junction-link">${esc(e.from)} → ${esc(e.to)}</span></button>`;
}
function layoutJunctions(){
  if(document.body.classList.contains('is-sorting'))return;
  const cards=new Map([...$('board').querySelectorAll('.shot')].map(el=>[el.dataset.id,el]));
  // Wrap connections get a separate lower lane; large labels never overlap adjacent pairs.
  $('board').querySelectorAll('.has-wrapped-edge').forEach(cell=>cell.classList.remove('has-wrapped-edge'));
  $('board').querySelectorAll('[data-board-edge]').forEach(button=>{
    const e=state.edges[button.dataset.boardEdge],a=cards.get(e?.from),b=cards.get(e?.to);
    if(a&&b&&a.parentElement.parentElement===b.parentElement.parentElement&&Math.abs(a.getBoundingClientRect().top-b.getBoundingClientRect().top)>=2)a.parentElement.classList.add('has-wrapped-edge');
  });
  $('board').querySelectorAll('[data-board-edge]').forEach(button=>{
    const e=state.edges[button.dataset.boardEdge],a=cards.get(e?.from),b=cards.get(e?.to);
    if(!a||!b||a.parentElement.parentElement!==b.parentElement.parentElement){button.style.visibility='hidden';return;}
    const from=a.getBoundingClientRect(),to=b.getBoundingClientRect(),cell=a.parentElement.getBoundingClientRect();
    const sameRow=Math.abs(from.top-to.top)<2;
    let x,y;
    const grid=a.parentElement.parentElement.getBoundingClientRect();
    if(sameRow){x=(from.right+to.left)/2;y=Math.max(from.bottom,to.bottom)+38;}
    else{x=grid.left+grid.width/2;y=cell.bottom-34;}
    button.style.width=Math.min(256,sameRow?to.left-from.left-16:grid.width-8)+'px';
    button.classList.toggle('is-wrapped',!sameRow);
    const wrappedGroup=!sameRow&&$('board').classList.contains('grouped');
    if(wrappedGroup)button.style.width=Math.max(44,grid.width-8)+'px';
    button.querySelector('.junction-link').textContent=(wrappedGroup?(Math.abs(from.left-to.left)<2?'接下一镜 · ':'接下一行 · '):'')+e.from+' → '+e.to;
    button.style.left=(x-cell.left)+'px';button.style.top=(y-cell.top)+'px';button.style.visibility='visible';
  });
}
function scheduleJunctionLayout(){cancelAnimationFrame(junctionFrame);junctionFrame=requestAnimationFrame(layoutJunctions);}
function referenceCard(r,g){return `<article class="reference-card ${r.needsRevision?'needs-revision':''}" data-reference="${esc(r.id)}" data-ref-group="${esc(g.id)}"><div class="reference-thumb" data-action="select-reference" data-id="${esc(r.id)}" role="button" tabindex="0" aria-label="选择素材 ${esc(r.id)}" aria-pressed="false"><img src="${imageOf(r)}" alt="${esc(r.title)}" draggable="false"><span class="tag">${esc(r.id)}</span>${r.needsRevision?'<span class="revision-badge">待修改</span>':''}<span class="reference-check" aria-hidden="true"></span></div><div class="reference-body"><select data-reference-role="${esc(r.id)}" data-ref-group="${esc(g.id)}" aria-label="${esc(r.id)} 参考职责">${options(roles,r.role)}</select><h3>${esc(r.title)}</h3><p class="note">${esc(r.scope||'先选择素材职责，再补充需要锁定的内容。')}</p><div class="row">${dragHandleMarkup(r.id,g.id)}<button data-action="edit-reference" data-id="${esc(r.id)}" data-group="${esc(g.id)}">职责与边界</button><button data-action="replace-reference" data-id="${esc(r.id)}" data-group="${esc(g.id)}">换图</button><button data-action="detach-reference" data-id="${esc(r.id)}" data-group="${esc(g.id)}">移出本组</button></div></div></article>`;}
function assetSection(g){const list=refs(g);return `<section class="group-section asset-section ${panel.type==='group'&&panel.id===g.id?'active-group':''}" data-group="${esc(g.id)}" style="--group:${g.color}"><div class="group-heading"><div><span class="group-name">${esc(g.id)}</span><span class="group-title">资产驱动 · ${list.length} 张参考 → 一段视频任务</span><p>上传顺序只用于素材绑定，不代表镜头顺序；资产之间不设置转场。</p></div><button data-action="group-view" data-id="${esc(g.id)}">剧情与组设置</button></div><div class="reference-grid">${list.map(r=>referenceCard(r,g)).join('')}<div class="reference-add"><button data-action="add-reference" data-id="${esc(g.id)}">＋ 上传人物 / 场景 / 道具</button><button data-action="pick-reference" data-id="${esc(g.id)}">复用已有素材</button></div></div><div class="group-story"><span class="small muted">本组完整正文 · ${esc(groupPromptStatus(g))}</span><button data-action="group-view" data-id="${esc(g.id)}">查看 / 编辑完整提示词</button></div>${g.members.length?'<p class="note">原分镜和衔接已保留但暂停使用；切回分镜驱动即可恢复，不会将它们偷偷作为本组参考上传。</p>':''}</section>`;}
function shotCell(id,nextId){
    const i=state.order.indexOf(id);
    const s=shot(id),g=groupOf(id),selected=selection.has(id);
    return `<div class="cell"><article class="shot ${selected?'selected':''} ${s.needsRevision?'needs-revision':''}" data-id="${esc(id)}" style="--group:${g?.color||'#777'}">
      <div class="thumb" data-action="select" data-id="${esc(id)}" role="button" tabindex="0" aria-label="选择分镜 ${esc(id)}" aria-pressed="${selected}"><img src="${imageOf(s)}" alt="${esc(s.title)}" draggable="false"><span class="seq">${String(i+1).padStart(2,'0')}</span>${s.needsRevision?'<span class="revision-badge">待修改</span>':''}<input class="choose" type="checkbox" aria-label="选中 ${esc(id)}" ${selected?'checked':''} tabindex="-1"></div>
      <div class="shothead"><span class="shotid">${esc(id)}</span><select class="group-assignment" data-shot-group="${esc(id)}" aria-label="${esc(id)} 归属组"><option value="" ${!g?'selected':''}>未编组</option>${state.groups.filter(x=>!assetMode(x)).map(x=>`<option value="${esc(x.id)}" ${g?.id===x.id?'selected':''}>${esc(x.id)}</option>`).join('')}<option value="__new">新建组…</option></select></div><div class="shotcaption"><div class="shottitle">${esc(s.title)}</div><label class="shot-camera"><span>运镜</span><select data-shot-camera="${esc(id)}" aria-label="${esc(id)} 运镜方式" title="${esc(cameraName(s.camera)+'：'+cameraDescription(s.camera))}">${cameraOptions(s.camera)}</select></label></div>
      <div class="shottools">${dragHandleMarkup(id)}<button data-action="edit-shot" data-id="${esc(id)}">详情</button><button data-action="replace" data-id="${esc(id)}">换图</button><button data-action="view" data-id="${esc(id)}">放大</button></div>
      </article>${nextId?junctionButton(pairKey(id,nextId)):''}</div>`;
}
function renderBoard(){
  if(dragging?.phase)finishCardSort(true);
  const grouped=(state.view||'groups')==='groups';
  $('board').style.setProperty('--cols',state.cols);$('board').classList.toggle('grouped',grouped);
  const blanks=Array.from({length:Math.max(1,state.cols*state.cols-state.order.length)},(_,i)=>`<div class="cell empty" data-empty="true"><span class="plus">＋</span><button data-action="add">填入新画面</button><span class="small">空位 ${String(state.order.length+i+1).padStart(2,'0')}</span></div>`).join('');
  if(grouped){
    $('board').innerHTML=state.groups.map(g=>{if(assetMode(g))return assetSection(g);const ids=members(g);return `<section class="group-section ${panel.type==='group'&&panel.id===g.id?'active-group':''}" data-group="${esc(g.id)}" style="--group:${g.color}"><div class="group-heading"><div><span class="group-name">${esc(g.id)}</span><span class="group-title">分镜驱动 · ${ids.length} 张主要分镜资产</span><p>故事位置 ${ids.map(id=>String(state.order.indexOf(id)+1).padStart(2,'0')).join(' / ')} · 共同生成一个段落，不默认首尾帧</p></div><button data-action="group-view" data-id="${esc(g.id)}">组设置</button></div><div class="group-grid" style="--group-cols:${Math.max(1,Math.min(2,state.cols,ids.length))}">${ids.map((id,i)=>shotCell(id,ids[i+1])).join('')}</div>${supportAssetsSection(g)}</section>`;}).join('');
    const ungrouped=state.order.filter(id=>!groupOf(id));
    if(ungrouped.length)$('board').innerHTML+=`<section class="group-section unassigned"><div class="group-heading"><h3>待编组画面</h3><span class="note">在图片菜单中选择归属</span></div><div class="group-grid" style="--group-cols:${Math.min(2,state.cols,ungrouped.length)}">${ungrouped.map(id=>shotCell(id,null)).join('')}</div></section>`;
    $('board').innerHTML+=`<div class="empty-bank">${blanks}</div>`;
  }else $('board').innerHTML=state.order.filter(shotIsActive).map(id=>{const i=state.order.indexOf(id),next=state.order[i+1];return shotCell(id,shotIsActive(next)?next:null);}).join('')+blanks+(state.groups.some(assetMode)?'<p class="asset-view-note note">此视图只排列启用的分镜；人物、场景等参考不是镜头，请切回“按生成组”查看资产任务。</p>':'');
  $('groupView').classList.toggle('active',grouped);$('sequenceView').classList.toggle('active',!grouped);
  $('groupView').setAttribute('aria-pressed',String(grouped));$('sequenceView').setAttribute('aria-pressed',String(!grouped));
  $('canvasHelp').textContent=grouped?'组内每行最多两张，按从左到右、逐行向下阅读 · 行内转场在两图下方正中，跨行转场单独显示 · 一个外框 = 一次视频生成任务':'此处只排列分镜，不排列人物定妆图和场景资产 · 原镜号保留 · 拖动排序或框选编组';
  $('assignGroup').innerHTML='<option value="">分配到分镜组</option>'+state.groups.filter(g=>!assetMode(g)).map(g=>`<option value="${esc(g.id)}">${esc(g.id)}</option>`).join('');$('assignGroup').disabled=!selection.size;
  $('groups').innerHTML=`<span class="small muted">生成组</span>`+state.groups.map(g=>`<button class="group-chip ${panel.type==='group'&&panel.id===g.id?'active':''}" data-action="group-view" data-id="${esc(g.id)}" style="--group:${g.color}"><i></i><b>${esc(g.id)}</b><span>${assetMode(g)?'资产 '+refs(g).length:'分镜 '+members(g).length}</span></button>`).join('');
  $('selectionCount').textContent=selection.size?`已选 ${selection.size} 张`:'未选图片';
  $('group').disabled=!selection.size;
  $('gridSize').value=[3,4,5].includes(state.cols)?String(state.cols):'custom';
  $('customCols').style.display=[3,4,5].includes(state.cols)?'none':'block';$('customCols').value=state.cols;
  scheduleJunctionLayout();
  if(typeof syncQuickSelection==='function')syncQuickSelection();
  renderAssetLibrary();
}
function sourceLink(id){const s=PRESETS.sources[id];return s?.url?`<a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a>`:esc(s?.title||'导演设计');}
function renderInspector(){
  const box=$('inspector');
  if(panel.type==='edge'){
    const e=state.edges[panel.key];if(!edgeIsActive(e)){panel={type:'group',id:state.groups[0]?.id};return renderInspector();}
    const a=shot(e.from),b=shot(e.to),p=preset(e.visual),g=groupOf(a.id),scope=g&&g.members.includes(b.id)?g.id+' · 组内连接':'组间连接 / 后期套剪';
    $('inspectorKicker').textContent=scope;$('inspectorTitle').textContent=e.from+' → '+e.to;
    box.innerHTML=`<span class="statebadge">方案预设 · 尚未验证视频</span><div class="pair"><div><img src="${imageOf(a)}" alt="前镜"><div class="caption">${esc(a.id)}</div></div><span class="muted">→</span><div><img src="${imageOf(b)}" alt="后镜"><div class="caption">${esc(b.id)}</div></div></div>
      <label for="visualPreset">画面如何衔接</label><select id="visualPreset" data-field="visual">${options(PRESETS.visual,e.visual)}</select>
      <div class="preset-description"><span class="category">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.summary)}</p><p><b>成立条件：</b>${esc(p.conditions)}</p></div><div class="execution">执行位置：${esc(p.execution)}</div>
      <div class="field"><label for="audioPreset">声音如何衔接（可与画面预设叠加）</label><select id="audioPreset" data-field="audio">${options(PRESETS.audio,e.audio)}</select><p class="note">${esc(PRESETS.audio.find(x=>x.id===e.audio).summary)}</p></div>
      ${field('前镜切出点 / 离开当前构图时','out',e.out)}${field('后镜起始状态 / 到达下一构图时','in',e.in)}${field('中间补充：动作、台词或新增镜头','bridge',e.bridge)}${field('匹配要素：方向、视线、形状或遮挡物','match',e.match)}${field('衔接时机 / 过渡时长（按剧情填写）','timing',e.timing,'input')}${field('声音来源、进入或退出的位置','sound',e.sound)}
      <div class="rule"></div><p class="note">${sourceLink(p.source)}<br>${sourceLink(PRESETS.audio.find(x=>x.id===e.audio).source)}</p>`;
  }else if(panel.type==='group'){
    const g=state.groups.find(g=>g.id===panel.id);
    if(!g){$('inspectorTitle').textContent='选择画面或连接条';box.innerHTML='<p class="note">框选图片，再点击“将所选编组”。</p>';return;}
    const ids=members(g),isAsset=assetMode(g);$('inspectorKicker').textContent='生成任务 / '+(isAsset?'资产＋剧情':'分镜编排');$('inspectorTitle').textContent=g.id+' · '+(isAsset?refs(g).length:ids.length)+' 张参考';
    box.innerHTML=`<div class="field"><label for="inputMode">这组如何生成</label><select id="inputMode" data-field="inputMode"><option value="assets" ${isAsset?'selected':''}>资产驱动：参考素材＋一段剧情</option><option value="storyboard" ${!isAsset?'selected':''}>分镜驱动：画面顺序＋镜头衔接</option></select><p class="note">两套资料分别保留；切换模式不删除旧图，不自动把定妆照当作镜头。</p></div>${field('自定义组号（例如 A1、A2、B3）','groupId',g.id,'input')}<div class="field"><label>组别颜色（只用于识别）</label><div class="color-picker">${palette.map((color,i)=>`<button class="color-choice ${g.color===color?'active':''}" style="--choice:${color}" data-action="group-color" data-id="${esc(g.id)}" data-color="${color}" aria-label="${colorNames[i]}" aria-pressed="${g.color===color}" title="${colorNames[i]}"><span>${colorNames[i]}</span></button>`).join('')}</div></div><div class="field"><label for="groupMode">成片镜头组织</label><select id="groupMode" data-field="mode"><option value="auto" ${g.mode==='auto'?'selected':''}>按剧情设计，不预设镜数</option><option value="multi" ${g.mode==='multi'?'selected':''}>多镜剪辑段落</option><option value="continuous" ${g.mode==='continuous'?'selected':''}>连续镜头段落</option></select></div>
      ${groupPromptField(g)}${field(isAsset?'计划时长（可选；以实际生成入口为准）':'计划时长（秒；不是平台能力承诺）','duration',g.duration,'input')}
      ${isAsset?`${field('视觉风格（可选；留空继承已确认风格）','visualStyle',g.visualStyle)}${field('镜头与运镜要求（可选；不按资产张数拆镜）','cameraPlan',g.cameraPlan)}${field('台词与声音（可选；不替用户编造台词）','soundPlan',g.soundPlan)}${field('结束状态与连续性限制（可选）','endState',g.endState)}<div class="rule"></div><h3>上传绑定顺序（不是分镜顺序）</h3>${refs(g).map((r,i)=>`<p class="short-summary">图片${i+1} · ${esc(roles.find(x=>x.id===r.role)?.name)} · ${esc(r.title)}<br>${esc(r.scope)}</p>`).join('')}<div class="row"><button class="mini" data-action="add-reference" data-id="${esc(g.id)}">上传素材</button><button class="mini" data-action="pick-reference" data-id="${esc(g.id)}">复用素材</button></div><p class="note" style="margin-top:12px">一组输出一份自包含中文提示词。人物资产只锁身份，场景资产只锁空间；切镜、运镜和节奏由剧情决定。</p>`:`<div class="rule"></div><h3>分镜参考顺序</h3>${ids.map((id,i)=>`<p class="short-summary">图片${i+1} · ${esc(id)} · ${esc(shot(id).title)}<br>职责：主要分镜资产，不默认首尾帧</p>`).join('')}<h3>组内连接</h3>${ids.slice(1).map((id,i)=>edgeButton(pairKey(ids[i],id))).join('')}<button class="mini" data-action="select-group" data-id="${esc(g.id)}">选中本组分镜</button>`}
      <div class="rule"></div><div class="row"><button class="mini" data-action="group-up" data-id="${esc(g.id)}">任务前移</button><button class="mini" data-action="group-down" data-id="${esc(g.id)}">任务后移</button><button class="mini" data-action="dissolve-group" data-id="${esc(g.id)}">解除编组</button></div><p class="note" style="margin-top:12px">调整的是生成任务顺序，不重排素材上传顺序；解除编组保留原图、资产库和固定编号。</p>`;
  }else if(panel.type==='reference'){
    const r=refAsset(panel.id);if(!r)return;$('inspectorKicker').textContent='素材职责 / 不等于镜头';$('inspectorTitle').textContent=r.id;
    box.innerHTML=`<img src="${imageOf(r)}" class="reference-detail" alt="${esc(r.title)}">${field('素材名称 / 角色姓名','title',r.title,'input')}<div class="field"><label for="referenceRole">参考职责</label><select id="referenceRole" data-field="role">${options(roles,r.role)}</select></div>${field('只继承哪些内容','scope',r.scope)}${field('哪些内容不继承','exclude',r.exclude)}<p class="note">被这些组复用：${state.groups.filter(g=>g.referenceIds.includes(r.id)).map(g=>esc(g.id)).join('、')||'暂无'}。修改素材会影响这些引用并使本版确认失效。<br>原文件：${esc(media[r.assetId]?.name)}<br>版本 ${r.assetVersion} · 不生成镜号</p>`;
  }else{
    const s=shot(panel.id);if(!s)return;$('inspectorKicker').textContent='固定镜号 / 与剧本关联';$('inspectorTitle').textContent=s.id;
    box.innerHTML=`<img src="${imageOf(s)}" style="width:100%;display:block" alt="${esc(s.title)}">${field('镜头名称','title',s.title,'input')}<div class="field"><label for="shotCameraDetail">运镜预设（本镜头内，不是转场）</label><select id="shotCameraDetail" data-field="camera">${cameraOptions(s.camera)}</select><p class="note camera-explanation">${esc(cameraDescription(s.camera))}</p></div>${field('画面内容与表演','action',s.action)}${field('人物 / 服装 / 空间 / 道具约束','continuity',s.continuity)}<p class="note" style="margin-top:16px">素材原名：${esc(media[s.assetId]?.name)}<br>图像版本：${s.assetVersion} · 替换不改镜号</p><div class="row" style="margin-top:16px"><button class="mini" data-action="move-left" data-id="${esc(s.id)}">前移一位</button><button class="mini" data-action="move-right" data-id="${esc(s.id)}">后移一位</button></div>`;
  }
  sizeGroupPrompt();
}
function inspect(key){panel={type:'edge',key};renderBoard();renderInspector();}
function validate(){
  const errors=[],warnings=[];
  if(!state.order.length&&!state.references.length)errors.push('至少填入一张分镜或参考素材。');
  if(!state.groups.length)errors.push('至少建立一个生成组。');
  const ungrouped=state.order.filter(id=>!groupOf(id));if(ungrouped.length)errors.push('尚未编组：'+ungrouped.join('、'));
  for(const id of state.order){if(!imageOf(shot(id)))errors.push(id+' 缺少原图。');if(shotIsActive(id)&&shot(id).needsRevision)errors.push(id+' 标记为待修改，请处理后取消标记再确认。');}
  for(const g of state.groups){
    for(const r of refs(g)){if(!imageOf(r))errors.push(r.id+' 缺少原图。');if(r.needsRevision)errors.push(g.id+' / '+r.id+' 标记为待修改，请处理后取消标记再确认。');if(r.role==='unknown')errors.push(g.id+' / '+r.title+' 尚未指定素材职责。');if(!r.title.trim()||!r.scope.trim())errors.push(r.id+' 需要素材名称和参考范围。');}
    if(assetMode(g)){
      const list=refs(g);if(!list.length)errors.push(g.id+' 尚未添加参考素材。');
      if(!groupPromptText(g).trim())errors.push(g.id+' 请先在完整正文框填写剧情要求或提示词。');
      for(const r of list){if(!imageOf(r))errors.push(r.id+' 缺少原图。');if(r.needsRevision)errors.push(g.id+' / '+r.id+' 标记为待修改，请处理后取消标记再确认。');if(r.role==='unknown')errors.push(g.id+' / '+r.title+' 尚未指定素材职责。');if(!r.title.trim()||!r.scope.trim())errors.push(r.id+' 需要素材名称和参考范围。');}
      if(g.duration!==''&&(!Number.isFinite(Number(g.duration))||Number(g.duration)<=0))errors.push(g.id+' 的计划时长必须为正数或留空。');
      if(!list.some(r=>r.role==='scene'))warnings.push(g.id+' 未绑定独立场景图，请核对剧情是否已交代空间。');
      if(!g.duration)warnings.push(g.id+' 时长未指定，撰写时需按剧情与实际入口确认。');
      continue;
    }
    const ids=members(g);if(!ids.length)errors.push(g.id+' 是空组。');
    if(!groupPromptText(g).trim())errors.push(g.id+' 请先在完整正文框填写剧情要求或提示词。');
    if(!Number.isFinite(Number(g.duration))||Number(g.duration)<=0)errors.push(g.id+' 需要有效的计划时长。');
    const indices=ids.map(id=>state.order.indexOf(id));if(indices.some((n,i)=>i&&n!==indices[i-1]+1))warnings.push(g.id+' 的图片在画布中不连续，须核对分组与整体套剪顺序。');
    ids.slice(1).forEach((id,i)=>{const e=state.edges[pairKey(ids[i],id)],p=preset(e.visual);if(g.mode==='continuous'&&!p.continuous)errors.push(g.id+' 标为连续镜头，却选择了“'+p.name+'”。');});
  }
  for(const [key] of pairs()){
    const e=state.edges[key];if(!e.out.trim()||!e.in.trim())errors.push(e.from+' → '+e.to+' 缺少切出点或下一镜起始状态。');
    if(preset(e.visual).continuous&&groupOf(e.from)?.id!==groupOf(e.to)?.id)warnings.push(e.from+' → '+e.to+' 跨生成组采用连续运镜：需合并生成或另行验证接续，不能保证无缝。');
    if(e.visual==='insert'&&!e.bridge.trim())errors.push(e.from+' 的插入镜头尚未补写。');
    if(['lead','carry'].includes(e.audio)&&!e.sound.trim())errors.push(e.from+' 的声音衔接需要指定来源和时机。');
    if(['graphic','occlusion','whip','focus','eyeline'].includes(e.visual)&&!e.match.trim())errors.push(e.from+' 的“'+preset(e.visual).name+'”需要填写匹配要素。');
  }
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
function renderGate(){
  const {errors,warnings}=validate(),confirmed=state.confirmedRevision===state.revision;
  $('revision').textContent='修订 '+String(state.revision).padStart(2,'0');
  $('auditList').innerHTML=(errors.length?errors.map(t=>`<div class="warn">待补 · ${esc(t)}</div>`):['<div class="pass">结构可提交 · 图号、编组与连接字段齐全；不代表画面或视频质量合格。</div>']).concat(warnings.map(t=>`<div>提醒 · ${esc(t)}</div>`)).join('');
  $('humanReview').checked=state.humanReviewed;$('confirmBoard').disabled=!!errors.length||!state.humanReviewed||confirmed||pendingUploads>0;
  $('requestPrompts').disabled=!confirmed||pendingUploads>0;
  $('confirmBoard').title=pendingUploads?'请等素材载入完成':confirmed?'本版已确认':errors.length?'请先处理上方待补事项':!state.humanReviewed?'请先勾选已审看本版画面':'确认这版分镜，进入提示词请求';
  $('requestPrompts').title=pendingUploads?'请等素材载入完成':!confirmed?'先完成本版分镜确认':'导出当前版本的提示词任务，不自动调用生成模型';
  $('gateStatus').textContent=state.requestedRevision===state.revision?'已登记生成请求 · 未调用模型':confirmed?'本版已确认 · 等待第二次确认':'分镜编排中 · 提示词未请求';
}
function render(keepInspector=false){ensureModel();ensureEdges();$('projectTitle').textContent='《'+state.title+'》 · '+state.order.filter(shotIsActive).length+' 张启用分镜 / '+state.references.length+' 份素材 / '+state.groups.length+' 个生成任务';renderBoard();if(!keepInspector)renderInspector();renderGate();}
function suggestGroupId(){
  let n=Math.max(state.nextGroup||0,...state.groups.map(g=>groupLetterIndex(g.id)+1)),letters='';
  do{letters=String.fromCharCode(65+n%26)+letters;n=Math.floor(n/26)-1;}while(n>=0);
  return letters.length<=4?letters+'1':null;
}
function validGroupId(id,except){return /^[A-Z]{1,4}[1-9][0-9]{0,2}$/.test(id)&&!state.groups.some(g=>g.id===id&&g.id!==except);}
function assignToGroup(ids,targetId){
  const target=state.groups.find(g=>g.id===targetId);if(targetId&&(!target||assetMode(target)))return;
  record('调整图片归属组',()=>{state.groups.forEach(g=>g.members=g.members.filter(id=>!ids.includes(id)));if(target)target.members.push(...ids);state.groups=state.groups.filter(g=>g.members.length||assetMode(g)||(g.referenceIds||[]).length);if(target)panel={type:'group',id:target.id};});
}
function createGroup(){
  if(!selection.size)return;
  if(!suggestGroupId())return toast('自动组号已到上限，请使用现有组。');
  const ids=state.order.filter(id=>selection.has(id));
  const existing=state.groups.filter(g=>g.members.some(id=>selection.has(id)));
  modal(`<h2>将 ${ids.length} 张图片编为一组</h2><p class="note">${ids.map(esc).join(' → ')}<br>这些图片共同作为主要分镜资产，不指定首尾帧。${existing.length?'<br>所选图片将从原组中移出；空组会解除，原图保留。':''}</p><div class="split"><div class="field"><label for="newGroupId">组号可自行命名</label><input id="newGroupId" value="${suggestGroupId()}" placeholder="A1 / A2 / B3"></div><div class="field"><label for="newGroupColor">分组颜色</label><select id="newGroupColor">${newGroupColorOptions()}</select></div></div><div class="dialog-actions"><button data-action="close">返回</button><button class="primary" id="acceptGroup">确认编组</button></div>`);
  $('acceptGroup').onclick=()=>{const id=$('newGroupId').value.trim().toUpperCase(),color=$('newGroupColor').value;if(!validGroupId(id))return toast('请使用未占用的字母＋数字组号，例如 A2、B3。');record('对所选分镜编组',()=>{
    state.groups.forEach(g=>g.members=g.members.filter(id=>!ids.includes(id)));state.groups=state.groups.filter(g=>g.members.length||assetMode(g)||(g.referenceIds||[]).length);
    reserveGroupId(id);state.groups.push({id,color,members:ids,inputMode:'storyboard',mode:'multi',intent:'',bridge:'',duration:''});panel={type:'group',id};
  });closeModal();toast('新组已建立，请在完整正文框填写剧情要求，并设置时长。');};
}
function move(id,to){const old=state.order.indexOf(id);if(old<0||to<0||to>=state.order.length||old===to)return;record('调整 '+id+' 的顺序',()=>{state.order.splice(old,1);state.order.splice(to,0,id);});}
let referenceUploadTarget=null;
function newReferenceId(){let id;do{id='素材-'+String(state.nextReference++).padStart(3,'0');}while(refAsset(id));return id;}
function changeRole(r,role){const old=roleRules[r.role]||['',''],next=roleRules[role]||['',''];if(!r.scope||r.scope===old[0])r.scope=next[0];if(!r.exclude||r.exclude===old[1])r.exclude=next[1];r.role=role;}
function createAssetGroup(){
  if(!suggestGroupId())return toast('自动组号已到上限，请使用现有组。');
  modal(`<h2>新建资产驱动任务</h2><p class="note">例如：两个人物＋一个场景＋一段剧情。同组素材不是连续镜头，不设置素材之间的转场。</p><div class="split"><div class="field"><label for="newGroupId">组号</label><input id="newGroupId" value="${suggestGroupId()}"></div><div class="field"><label for="newGroupColor">组色</label><select id="newGroupColor">${newGroupColorOptions()}</select></div></div><div class="dialog-actions"><button data-action="close">返回</button><button id="acceptAssetGroup" class="primary">建立资产组</button></div>`);
  $('acceptAssetGroup').onclick=()=>{const id=$('newGroupId').value.trim().toUpperCase(),color=$('newGroupColor').value;if(!validGroupId(id))return toast('请使用未占用的字母＋数字组号。');record('建立资产驱动任务',()=>{state.groups.push({id,color,members:[],referenceIds:[],inputMode:'assets',mode:'auto',intent:'',bridge:'',duration:''});reserveGroupId(id);state.view='groups';panel={type:'group',id};});closeModal();toast('添加参考素材，分别指定职责，再填写本组剧情。');};
}
function pickReferences(groupId){
  const g=state.groups.find(g=>g.id===groupId);if(!g)return;
  modal(`<h2>复用素材到 ${esc(g.id)}</h2><p class="note">同一人物、场景可被多个任务复用，不会从原组移走。分镜图作为参考导入时不会自动成为首尾帧。</p><div class="reuse-list">${state.references.map(r=>`<label class="reuse-item"><input type="checkbox" data-pick-ref="${esc(r.id)}" ${g.referenceIds.includes(r.id)?'checked disabled':''}><img src="${imageOf(r)}" alt=""><span>${esc(r.title)}<small>${esc(roles.find(x=>x.id===r.role)?.name)} · ${esc(r.id)}</small></span></label>`).join('')}</div><h3>从已有分镜添加构图参考</h3><div class="reuse-list">${state.shots.map(s=>`<label class="reuse-item"><input type="checkbox" data-pick-shot="${esc(s.id)}"><img src="${imageOf(s)}" alt=""><span>${esc(s.id)} · ${esc(s.title)}<small>只建立素材引用，原镜号不改变</small></span></label>`).join('')}</div><div class="dialog-actions"><button data-action="close">返回</button><button id="acceptReferences">加入本组</button></div>`);
  $('acceptReferences').onclick=()=>{const selected=[...$('modalContent').querySelectorAll('[data-pick-ref]:checked:not(:disabled)')].map(e=>e.dataset.pickRef),fromShots=[...$('modalContent').querySelectorAll('[data-pick-shot]:checked')].map(e=>shot(e.dataset.pickShot));if(!selected.length&&!fromShots.length){closeModal();return;}record('复用素材到 '+g.id,()=>{for(const s of fromShots){let r=state.references.find(r=>r.originShotId===s.id&&r.assetId===s.assetId);if(!r){r={id:newReferenceId(),title:s.title,role:'storyboard',scope:roleRules.storyboard[0],exclude:roleRules.storyboard[1],assetId:s.assetId,assetVersion:s.assetVersion,originShotId:s.id};state.references.push(r);}selected.push(r.id);}g.referenceIds=[...new Set([...g.referenceIds,...selected])];panel={type:'group',id:g.id};});closeModal();};
}
async function uploadReferences(files){
  if(!files.length||!referenceUploadTarget)return;if(pendingUploads)return toast('素材仍在载入，请稍后。');
  const target={...referenceUploadTarget},list=target.replaceId?[files[0]]:[...files];
  if(list.length>20||state.references.length+list.length>200)return toast('单次最多 20 张，此样板最多保存 200 份参考。');
  if(list.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>25*1024*1024))return toast('请选择每张不超过 25 MB 的 PNG、JPG 或 WebP。');
  pendingUploads++;renderGate();
  try{
    const loaded=[];
    for(const f of list){const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});await new Promise((res,rej)=>{const im=new Image();im.onload=res;im.onerror=rej;im.src=data;});loaded.push({assetId:'asset-'+uid(),data,name:f.name});}
    const g=state.groups.find(g=>g.id===target.groupId);if(!g)throw Error('原生成组已不存在，未写入素材。');
    record(target.replaceId?'替换参考素材':'加入参考素材',()=>{for(const item of loaded){media[item.assetId]={data:item.data,name:item.name};if(target.replaceId){const r=refAsset(target.replaceId);r.assetHistory=(r.assetHistory||[]).concat(r.assetId);r.assetId=item.assetId;r.assetVersion++;}else{const r={id:newReferenceId(),title:item.name.replace(/\.[^.]+$/,''),role:'unknown',scope:'',exclude:'',assetId:item.assetId,assetVersion:1};state.references.push(r);g.referenceIds.push(r.id);}}panel={type:'group',id:g.id};});
    toast('素材已载入；请分别指定人物、场景或其他参考职责。');
  }catch(error){toast(error.message||'素材无法载入，原内容保留。');}finally{pendingUploads--;$('referenceUpload').value='';renderGate();}
}
function showLibrary(fromJunction=false){
  const e=panel.type==='edge'&&edgeIsActive(state.edges[panel.key])?state.edges[panel.key]:null;
  modal(`<h2>${fromJunction===true?'设置两镜之间的转场':'电影衔接预设'}</h2>${e?`<div class="transition-target"><span class="mono">${esc(e.from)} → ${esc(e.to)}</span><span>当前：${esc(preset(e.visual).name)}</span></div>`:''}<p class="note">默认快切：直接切入下一镜，不加过渡特效；不强制加快表演节奏。<br>选择后仅应用到这两个镜号之间。声音、切出点与补充剧情可在衔接检查器中继续编辑。</p><div class="preset-grid">${PRESETS.visual.map(p=>`<button class="preset-card ${e?.visual===p.id?'active':''}" data-action="preset" data-id="${p.id}" aria-pressed="${e?.visual===p.id}"><b>${esc(p.name)}${e?.visual===p.id?' · 已选':''}</b><span>${esc(p.category)} / ${esc(p.summary)}</span></button>`).join('')}</div><p class="note">${e?'连续镜头与剪辑切换不可混写。':'请先在画布选择一条连接，再应用预设。'}预设用于组织导演意图，不是生成效果保证。</p>`);
}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
function exportHTML(){
  if(dragging?.phase)finishCardSort(true);
  const payload=snapshot();payload.state.instanceId=uid();
  const root=document.documentElement.cloneNode(true);
  root.querySelectorAll('.sort-overlay,.sort-status,#imageViewer').forEach(el=>el.remove());
  root.querySelector('body').classList.remove('is-sorting','is-painting','library-open');
  root.querySelector('#bootstrap').textContent=JSON.stringify(payload).replace(/</g,'\\u003c');
  for(const id of ['board','groups','inspector','auditList','modalContent','quickMenu','folderTree','libraryItems','librarySelection'])root.querySelector('#'+id).innerHTML='';
  root.querySelector('#quickMenu').hidden=true;root.querySelector('#quickMenu').removeAttribute('style');
  root.querySelector('#modal').removeAttribute('open');root.querySelector('#toast').style.display='none';root.querySelector('#marquee').style.display='none';
  download('<!doctype html>\n'+root.outerHTML,'分镜预演台_修订'+state.revision+'.html','text/html;charset=utf-8');toast('已导出含原图的便携 HTML；下载副本可独立打开。');
}
function compileRequest(){
  return {类型:'提示词生成任务_不是已生成提示词',项目:state.title,分镜修订:state.revision,确认时间:state.confirmedAt,正文回填说明:'生成后按组号将完整中文正文写入 state.groups 对应组的 promptText，并将 promptSource 设为 agent；原 intent 与 bridge 仅为历史存档，不得重新覆盖当前正文。未实际撰写完成时不要标记回填。载入更新后的资料即可显示。',要求:'先逐组读图审查参考职责，再按生成任务输出完整中文视频提示词。一个组是一条视频任务，参考张数不等于镜头数。资产组输出一段可直接复制的完整剧情提示词，不强制九栏或逐图拆镜；必要的摄影、表演、声音、起止状态融入该段。分镜组保留既定镜头与衔接。不得声称视频已生成。',
    分组:state.groups.map(g=>{const ids=members(g);if(assetMode(g))return {组号:g.id,输入方式:'资产驱动',组织方式:g.mode==='continuous'?'连续镜头段落':g.mode==='multi'?'多镜剪辑段落':'按剧情设计，不预设镜数',剧情:groupPromptText(g),补充:'',当前完整正文:groupPromptText(g),正文状态:groupPromptStatus(g),计划秒数:g.duration||null,视觉风格:g.visualStyle,摄影要求:g.cameraPlan,声音台词:g.soundPlan,结束状态:g.endState,
      参考资产:refs(g).map((r,i)=>libraryReferenceRequest(g,r,i+1)),组内衔接:[],输出形式:'每组一段完整中文视频提示词；素材绑定须明确；上传顺序不是镜头顺序，不默认首尾帧。按剧情安排有动机的镜头和切点，人物与场景不作为转场节点。未确认画风不得改写，未指定台词不擅自添加。',自检:['人物身份与数量','空间和人物比例','道具归属与动作因果','镜头方向与起止状态','时长可执行性','声音与台词一致性']};return {组号:g.id,输入方式:'分镜驱动',组织方式:g.mode==='continuous'?'连续镜头段落':g.mode==='auto'?'按剧情设计':'多镜剪辑段落',剧情:groupPromptText(g),补充:'',当前完整正文:groupPromptText(g),正文状态:groupPromptStatus(g),计划秒数:g.duration,
      参考资产:ids.map((id,i)=>({上传顺序:i+1,镜号:id,职责:'主要场景与分镜资产，不默认首尾帧',画面:shot(id),摄影机设计:cameraRequest(shot(id)),原始文件名:media[shot(id).assetId].name})),
      辅助参考资产:refs(g).map((r,i)=>libraryReferenceRequest(g,r,ids.length+i+1)),素材使用说明:'主分镜决定叙事与构图，辅助参考只按各自职责继承，不新增镜头，不默认首尾帧；冲突时先询问用户。',
      组内衔接:ids.slice(1).map((id,i)=>{const e=state.edges[pairKey(ids[i],id)],p=preset(e.visual);return {...e,画面预设:p.name,预设转译:p.instruction,适用条件:p.conditions,执行位置:p.execution,声音预设:PRESETS.audio.find(a=>a.id===e.audio).name};})};}),
    组间衔接:state.order.slice(1).flatMap((id,i)=>{const e=state.edges[pairKey(state.order[i],id)];return edgeIsActive(e)&&groupOf(id)?.id!==groupOf(state.order[i])?.id?[e]:[];}),
    素材库目录:libraryCatalog(),素材管理说明:'文件夹仅用于分类。只使用各组明确关联的素材与职责，未关联素材不得自动加入剧情。',
    任务顺序:state.groups.map(g=>g.id),资产模式提示词形式:'一段完整正文，内容自洽，可直接复制使用',分镜模式提示词结构:['片段任务','素材绑定','场景与起始状态','分镜时间轴','摄影机与焦点','表演与物理反馈','光线与画风','声音与台词','结束状态与限制']};
}
function requestPrompts(){
  if(state.confirmedRevision!==state.revision)return toast('请先确认当前分镜版本。');
  const revision=state.revision;
  modal(`<h2>确认按本版请求提示词？</h2><p>修订 ${revision} · ${state.groups.length} 个生成任务</p><p class="short-summary">资产组：参考素材＋整段剧情，合成一段完整中文提示词。分镜组：保留既定镜头、运镜与衔接。资料包含各图职责与原图；此样板只导出任务，不调用模型或扣费。</p><p class="note">把下载的资料文件交回助手，即可逐组读图撰写；不会将素材张数当作镜头数。</p><div class="dialog-actions"><button data-action="close">继续检查</button><button id="acceptRequest" class="primary">确认并导出生成任务</button></div>`);
  $('acceptRequest').onclick=()=>{if(state.revision!==revision||state.confirmedRevision!==revision)return toast('版本已变化，请重新确认。');state.requestedRevision=revision;state.requestedAt=new Date().toISOString();state.request=compileRequest();scheduleSave();renderGate();download(JSON.stringify(snapshot(),null,2),'提示词生成任务_修订'+revision+'.json','application/json');closeModal();toast('任务已导出；尚未生成提示词或视频。');};
}
function verifyImport(p){
  if(!p||p.schema!=='fantasy-director-board-v0.1'||p.state?.projectId!==BOOT.state.projectId)throw Error('这不是当前项目的兼容画布资料，不会覆盖现有内容。');
  const s=p.state;if(!Array.isArray(s.shots)||!Array.isArray(s.order)||!Array.isArray(s.groups)||!s.edges||!p.media||s.shots.length>200)throw Error('资料结构不完整。');
  for(const item of [...s.shots,...(Array.isArray(s.references)?s.references:[])])if(item.needsRevision!==undefined&&typeof item.needsRevision!=='boolean')throw Error('待修改标记格式有误。');
  const ids=new Set();
  for(const x of s.shots){if(!/^[\w\u4e00-\u9fff-]{1,40}$/.test(x.id)||ids.has(x.id))throw Error('镜号格式或唯一性有误。');ids.add(x.id);if(!p.media[x.assetId]||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.media[x.assetId].data))throw Error('图片缺失或不是支持的原图格式。');for(const k of ['title','action','continuity','camera'])if(typeof x[k]!=='string')throw Error('镜头字段格式有误。');}
  if(s.order.length!==ids.size||new Set(s.order).size!==ids.size||s.order.some(id=>!ids.has(id)))throw Error('排列与镜号不一致。');
  const assigned=new Set(),gids=new Set();
  const referenceIds=new Set();
  if(s.references!==undefined&&(!Array.isArray(s.references)||s.references.length>200))throw Error('素材库格式有误。');
  for(const r of s.references||[]){if(!/^[\w\u4e00-\u9fff-]{1,60}$/.test(r.id)||referenceIds.has(r.id)||!roles.some(x=>x.id===r.role)||!p.media[r.assetId]||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.media[r.assetId].data))throw Error('素材编号、职责或图片有误。');referenceIds.add(r.id);for(const k of ['title','scope','exclude'])if(typeof r[k]!=='string')throw Error('素材参考说明有误。');}
  for(const g of s.groups){if(!/^[A-Z]{1,4}[1-9][0-9]{0,2}$/.test(g.id)||gids.has(g.id)||!/^#[0-9a-f]{6}$/i.test(g.color)||!Array.isArray(g.members)||!['multi','continuous','auto'].includes(g.mode)||(g.inputMode!==undefined&&!['assets','storyboard'].includes(g.inputMode)))throw Error('分组格式有误。');gids.add(g.id);for(const id of g.members){if(!ids.has(id)||assigned.has(id))throw Error('分组存在重复或未知镜号。');assigned.add(id);}for(const k of ['intent','bridge'])if(typeof g[k]!=='string')throw Error('分组说明格式有误。');if(g.referenceIds!==undefined&&(!Array.isArray(g.referenceIds)||new Set(g.referenceIds).size!==g.referenceIds.length||g.referenceIds.some(id=>!referenceIds.has(id))))throw Error('生成组引用了未知或重复素材。');for(const k of ['visualStyle','cameraPlan','soundPlan','endState'])if(g[k]!==undefined&&typeof g[k]!=='string')throw Error('生成组扩展说明格式有误。');}
  for(const g of s.groups){if(g.promptText!==undefined&&typeof g.promptText!=='string')throw Error('完整提示词必须为文本。');if(g.promptSource!==undefined&&!['legacy','empty','edited','agent'].includes(g.promptSource))throw Error('提示词来源标记有误。');}
  for(const [key,e] of Object.entries(s.edges)){if(!ids.has(e.from)||!ids.has(e.to)||key!==pairKey(e.from,e.to)||!PRESETS.visual.some(x=>x.id===e.visual)||!PRESETS.audio.some(x=>x.id===e.audio))throw Error('连接数据有误。');for(const k of ['out','in','bridge','match','timing','sound','note'])if(typeof e[k]!=='string')throw Error('连接说明字段有误。');}
  if(!Number.isInteger(s.cols)||s.cols<1||s.cols>8||!Number.isInteger(s.revision)||s.revision<1||!Number.isInteger(s.nextGroup)||s.nextGroup<0||!Array.isArray(s.log))throw Error('版本或布局字段有误。');
  verifyLibraryImport(p);
  return true;
}
async function uploadFile(file){
  if(!file)return;if(pendingUploads)return toast('上一张图片仍在载入，请稍后。');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>25*1024*1024)return toast('请选择不超过 25 MB 的 PNG、JPG 或 WebP 原图。');
  pendingUploads++;renderGate();const target=uploadTarget;
  try{
    const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
    await new Promise((res,rej)=>{const img=new Image();img.onload=res;img.onerror=rej;img.src=data;});
    const assetId='asset-'+uid();media[assetId]={data,name:file.name};
    record(target?'替换 '+target+' 的图片':'填入新分镜',()=>{
      if(target){const s=shot(target);s.assetHistory=(s.assetHistory||[]).concat(s.assetId);s.assetId=assetId;s.assetVersion++;}
      else{const id='补镜-'+String(state.nextShot++).padStart(2,'0');state.shots.push({id,title:file.name.replace(/\.[^.]+$/,''),assetId,assetVersion:1,camera:DEFAULT_CAMERA,action:'',continuity:''});state.order.push(id);panel={type:'shot',id};}
    });toast('原图已载入；相关版本确认已清除。');
  }catch(e){toast('图片无法载入，原内容未替换。');}finally{pendingUploads--;$('upload').value='';renderGate();}
}
document.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');if(!target)return;const {action,id,key}=target.dataset;
  if(action==='add-reference'||action==='replace-reference'){referenceUploadTarget={groupId:action==='add-reference'?id:target.dataset.group,replaceId:action==='replace-reference'?id:null};$('referenceUpload').multiple=action==='add-reference';$('referenceUpload').click();return;}
  if(action==='pick-reference'){pickReferences(id);return;}
  if(action==='edit-reference'){openLibraryBinding([id],target.dataset.group);return;}
  if(action==='detach-reference'){record('移出本组参考（原图保留）',()=>{const g=state.groups.find(g=>g.id===target.dataset.group);g.referenceIds=g.referenceIds.filter(x=>x!==id);delete g.referenceBindings[id];panel={type:'group',id:g.id};});return;}
  if(action==='group-up'||action==='group-down'){const from=state.groups.findIndex(g=>g.id===id),to=from+(action==='group-up'?-1:1);if(to<0||to>=state.groups.length)return;record('调整生成任务顺序',()=>{state.groups.splice(to,0,state.groups.splice(from,1)[0]);});return;}
  if(action==='select'||action==='select-reference'){quickToggle(action==='select'?'shot':'reference',id,target,event);return;}
  if(action==='edge'){inspect(key);return;}
  if(action==='choose-edge'){if(!edgeIsActive(state.edges[key]))return;inspect(key);modalReturnEdgeKey=key;showLibrary(true);return;}
  if(action==='edit-shot'){panel={type:'shot',id};renderInspector();return;}
  if(action==='group-view'){seedreamNavigateGroup(id);return;}
  if(action==='group-color'){record('修改 '+id+' 的分组颜色',()=>state.groups.find(g=>g.id===id).color=target.dataset.color);return;}
  if(action==='select-group'){selection=new Set(members(state.groups.find(g=>g.id===id)));renderBoard();return;}
  if(action==='replace'||action==='add'){uploadTarget=action==='replace'?id:null;$('upload').click();return;}
  if(action==='view'){const s=shot(id);modal(`<h2>${esc(id)} · ${esc(s.title)}</h2><img class="modal-image" src="${imageOf(s)}" alt="分镜原图"><p class="note">${esc(media[s.assetId].name)}</p>`);return;}
  if(action==='close'){closeModal();return;}
  if(action==='move-left'||action==='move-right'){move(id,state.order.indexOf(id)+(action==='move-left'?-1:1));return;}
  if(action==='dissolve-group'){modal(`<h2>解除 ${esc(id)} 编组？</h2><p class="note">图片、镜号与连接说明全部保留，仅解除这一组关系。确认状态会失效。</p><div class="dialog-actions"><button data-action="close">返回</button><button id="acceptDissolve">解除编组</button></div>`);$('acceptDissolve').onclick=()=>{record('解除 '+id+' 编组',()=>state.groups=state.groups.filter(g=>g.id!==id));closeModal();};return;}
  if(action==='preset'){if(panel.type!=='edge')return toast('请先关闭预设库，并在画布选择一条连接。');if(state.edges[panel.key].visual!==id)record('修改画面衔接预设',()=>state.edges[panel.key].visual=id);closeModal();}
});
$('inspector').addEventListener('input',event=>{if(event.target.matches('[data-group-prompt]'))updateGroupPrompt(event.target);});
$('inspector').addEventListener('focusout',event=>{if(event.target.matches('[data-group-prompt]'))groupPromptEdit=null;});
window.addEventListener('resize',sizeGroupPrompt);
document.fonts.ready.then(sizeGroupPrompt);
$('inspector').addEventListener('change',event=>{
  const el=event.target,k=el.dataset.field;if(!k)return;
  const object=panel.type==='edge'?state.edges[panel.key]:panel.type==='group'?state.groups.find(g=>g.id===panel.id):panel.type==='reference'?refAsset(panel.id):shot(panel.id);
  if(!object||object[k]===el.value)return;
  if(k==='camera'&&panel.type==='shot'){changeShotCamera(panel.id,el.value);return;}
  if(k==='groupId'){const id=el.value.trim().toUpperCase();if(!validGroupId(id,object.id)){el.value=object.id;return toast('组号需要唯一，例如 A1、A2、B3。');}record('修改生成组名称',()=>{object.id=id;panel.id=id;});return;}
  if(k==='role'&&panel.type==='reference'){record('修改素材职责',()=>changeRole(object,el.value));return;}
  record('修改'+(panel.type==='edge'?'连接':panel.type==='group'?'生成组':'分镜')+'说明',()=>object[k]=el.value,el.tagName!=='SELECT');
});
$('board').addEventListener('change',e=>{const cameraId=e.target.dataset.shotCamera;if(cameraId){changeShotCamera(cameraId,e.target.value);return;}const rid=e.target.dataset.referenceRole;if(rid){setBoundReferenceRole(e.target.dataset.refGroup,rid,e.target.value);return;}const id=e.target.dataset.shotGroup;if(!id)return;const target=e.target.value;if(target==='__new'){selection=new Set([id]);createGroup();renderBoard();}else assignToGroup([id],target);});
$('assignGroup').onchange=e=>{if(e.target.value&&selection.size)assignToGroup(state.order.filter(id=>selection.has(id)),e.target.value);};
$('groupView').onclick=()=>{state.view='groups';scheduleSave();renderBoard();};$('sequenceView').onclick=()=>{referenceSelection.clear();state.view='sequence';scheduleSave();renderBoard();};
$('board').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&['select','select-reference'].includes(event.target.dataset.action)){event.preventDefault();event.target.click();}});
$('gridSize').onchange=e=>{if(e.target.value==='custom'){$('customCols').style.display='block';$('customCols').focus();return;}state.cols=Number(e.target.value);scheduleSave();renderBoard();};
$('customCols').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>8){toast('列数为 1 至 8。');e.target.value=state.cols;return;}state.cols=n;scheduleSave();renderBoard();};
$('selectAll').onclick=()=>{referenceSelection.clear();selection=new Set(state.order.filter(shotIsActive));renderBoard();};$('clearSelect').onclick=()=>{selection.clear();referenceSelection.clear();syncQuickSelection();};$('group').onclick=createGroup;$('newAssetGroup').onclick=createAssetGroup;
function undoBoardChange(){
  if(!undoStack.length){toast('没有可撤销的操作。');return;}
  const rev=state.revision+1;state=undoStack.pop();state.revision=rev;invalidate();
  selection=new Set([...selection].filter(id=>state.order.includes(id)));
  ensureModel();scheduleSave();render();toast('已撤销上一步操作。');
}
$('humanReview').onchange=e=>{state.humanReviewed=e.target.checked;if(!e.target.checked)invalidate();scheduleSave();renderGate();};
$('confirmBoard').onclick=()=>{if(validate().errors.length||!state.humanReviewed)return;state.confirmedRevision=state.revision;state.confirmedAt=new Date().toISOString();scheduleSave();renderGate();toast('分镜版本已确认；尚未请求生成提示词。');};
$('requestPrompts').onclick=requestPrompts;$('library').onclick=showLibrary;$('closeModal').onclick=closeModal;
$('saveHtml').onclick=exportHTML;$('saveJson').onclick=()=>download(JSON.stringify(snapshot(),null,2),'分镜预演资料_修订'+state.revision+'.json','application/json');
$('upload').onchange=e=>uploadFile(e.target.files[0]);$('referenceUpload').onchange=e=>uploadReferences(e.target.files);$('import').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>200*1024*1024)throw Error('资料超过此样板的 200 MB 载入限制。');const p=JSON.parse(await f.text());verifyImport(p);modal(`<h2>载入当前项目的另一版资料？</h2><p class="note">将载入修订 ${p.state.revision}，保留本次会话的撤销入口。建议先导出现有版本。载入后需要重新确认。</p><div class="dialog-actions"><button data-action="close">返回</button><button id="acceptImport">确认载入</button></div>`);$('acceptImport').onclick=()=>{undoStack.push(structuredClone(state));if(undoStack.length>8)undoStack.shift();const instance=state.instanceId;media={...media,...p.media};state=p.state;state.instanceId=instance;state.confirmedRevision=null;state.requestedRevision=null;state.humanReviewed=false;selection.clear();panel={type:'edge',key:pairKey(state.order[0],state.order[1])};scheduleSave();render();closeModal();};}catch(error){toast(error.message||'无法载入，现有内容未修改。');}finally{e.target.value='';}};
async function init(){
  try{db=await openDB();const cached=await new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get(state.instanceId);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(cached){verifyImport(cached);state=cached.state;media=cached.media;}$('saveStatus').textContent=cached?'已恢复本机保存的方案':'原始样板 · 修改后本机自动保存';}catch(e){$('saveStatus').textContent='本地存储不可用，请导出 HTML 保留修改';}
  ensureModel();ensureEdges();render();window.__boardReady=true;
}
window.addEventListener('pagehide',()=>{if(db)saveNow();});
window.addEventListener('resize',scheduleJunctionLayout);
new ResizeObserver(scheduleJunctionLayout).observe($('board'));
document.fonts.ready.then(scheduleJunctionLayout);
$('modal').addEventListener('close',()=>{const key=modalReturnEdgeKey;modalReturnEdgeKey=null;if(key)requestAnimationFrame(()=>[...$('board').querySelectorAll('[data-board-edge]')].find(b=>b.dataset.boardEdge===key)?.focus({preventScroll:true}));});
init();
