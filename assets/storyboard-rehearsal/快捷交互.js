/* 快捷工作流：剪贴板、右键编组、待修改、滑选与整组选中排序。 */
let referenceSelection=new Set(),lastCanvasGroup=null,quickContext=null,paintGesture=null,paintScrollFrame;
let suppressPaintClickUntil=0,copyBusy=false;
const isTextEditor=el=>!!el?.closest('input:not([type=checkbox]),textarea,select,[contenteditable="true"]');
const itemFor=(kind,id)=>kind==='reference'?refAsset(id):shot(id);
const setFor=kind=>kind==='reference'?referenceSelection:selection;
const cardKind=el=>el?.classList.contains('reference-card')?'reference':'shot';
const cardId=el=>el?.dataset.reference||el?.dataset.id;
const visibleIds=kind=>[...new Set([...$('board').querySelectorAll(kind==='reference'?'.reference-card':'.shot')].map(cardId))];
function useSelection(kind,ids){if(kind==='reference'){selection.clear();referenceSelection=new Set(ids);}else{referenceSelection.clear();selection=new Set(ids);}syncQuickSelection();}
function pasteDestination(){
  if(selection.size){const ids=state.order.filter(id=>selection.has(id)),groups=new Set(ids.map(id=>groupOf(id)?.id));return {kind:'shot',after:ids.at(-1),groupId:groups.size===1?[...groups][0]:null};}
  const g=state.groups.find(g=>g.id===lastCanvasGroup)||(panel.type==='group'?state.groups.find(g=>g.id===panel.id):null);
  if(state.view==='sequence'&&assetMode(g))return {kind:'shot',groupId:null,after:null};
  return {kind:assetMode(g)?'reference':'shot',groupId:g?.id||null,after:g&&!assetMode(g)?members(g).at(-1):null};
}
function syncQuickSelection(){
  selection=new Set([...selection].filter(id=>shot(id)&&shotIsActive(id)));
  referenceSelection=new Set([...referenceSelection].filter(id=>refAsset(id)&&state.groups.some(g=>assetMode(g)&&g.referenceIds.includes(id))));
  $('board').querySelectorAll('.shot,.reference-card').forEach(card=>{const selected=setFor(cardKind(card)).has(cardId(card));card.classList.toggle('selected',selected);const thumb=card.querySelector('.thumb,.reference-thumb');thumb?.setAttribute('aria-pressed',String(selected));const box=card.querySelector('.choose');if(box)box.checked=selected;});
  const count=selection.size||referenceSelection.size;
  $('selectionCount').textContent=count?`已选 ${count} 张${referenceSelection.size?'素材':''}`:'未选图片';
  $('assignGroup').disabled=!selection.size;$('group').disabled=!selection.size;
  $('canvasHelp').textContent=((state.view||'groups')==='groups'?'组内每行最多两张，逐行向下 · ':'')+'图片滑动多选 · 六点手柄拖动换位 · 右键复制 / 选色 / 待修改';
}
function quickToggle(kind,id,target,event){
  if(event.detail!==0&&performance.now()<suppressPaintClickUntil)return;
  lastCanvasGroup=target.closest('[data-group]')?.dataset.group||groupOf(id)?.id||null;
  const selected=new Set(setFor(kind));selected.has(id)?selected.delete(id):selected.add(id);useSelection(kind,selected);
  target.focus({preventScroll:true});
}
function closeQuickMenu(restore=false){
  $('quickMenu').hidden=true;
  if(restore&&quickContext){const c=[...$('board').querySelectorAll('.shot,.reference-card')].find(el=>cardKind(el)===quickContext.kind&&cardId(el)===quickContext.focusId);c?.querySelector('.thumb,.reference-thumb')?.focus({preventScroll:true});}
}
function showQuickMenu(card,x,y){
  finishPaint();const kind=cardKind(card),id=cardId(card);
  lastCanvasGroup=card.closest('[data-group]')?.dataset.group||groupOf(id)?.id||null;
  if(!setFor(kind).has(id))useSelection(kind,[id]);
  const ids=visibleIds(kind).filter(key=>setFor(kind).has(key));
  quickContext={kind,ids,focusId:id,groupId:lastCanvasGroup};
  const item=itemFor(kind,id),allPending=ids.every(key=>itemFor(kind,key).needsRevision);
  $('quickMenu').innerHTML=`<div class="quick-menu-head">${ids.length>1?'已选 '+ids.length+' 张':esc(item.title)}<small>${kind==='reference'?'素材绑定，不是分镜时间线':'镜号不变 · 原图保留'}</small></div><button role="menuitem" data-quick="copy">复制${ids.length>1?'右键这张':'图片'}<span>${esc(id)}</span></button><div class="quick-menu-label">${kind==='reference'?'按颜色复用到资产组':'按颜色编入分镜组'}</div><div class="quick-colors" role="group" aria-label="颜色编组">${quickGroupButtons(kind)}</div><button role="menuitem" data-quick="pending">标记为待修改<span>灰度＋角标</span></button><button role="menuitem" data-quick="restore" ${!ids.some(key=>itemFor(kind,key).needsRevision)?'disabled':''}>取消待修改<span>${allPending?'恢复原色':'仅清除标记'}</span></button><div class="quick-menu-label">快速调整${kind==='reference'?'绑定顺序':'排列顺序'}</div><div class="quick-moves"><button role="menuitem" data-quick="earlier">前移</button><button role="menuitem" data-quick="later">后移</button><button role="menuitem" data-quick="first">置前</button><button role="menuitem" data-quick="last">置后</button></div><p>多选后操作整批；排序与滑选使用不同手势。</p>`;
  const menu=$('quickMenu');menu.hidden=false;menu.style.left='0px';menu.style.top='0px';
  const r=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-r.height-8))+'px';
  menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}
function setPending(context,value){
  const items=context.ids.map(id=>itemFor(context.kind,id)).filter(Boolean);
  if(!items.some(item=>item.needsRevision!==value))return toast(value?'这些图片已是待修改。':'这些图片没有待修改标记。');
  record(value?'批量标记待修改':'取消待修改标记',()=>items.forEach(item=>item.needsRevision=value));
  toast(value?`已标记 ${items.length} 张待修改；原图未更改，确认前需处理。`:`已取消 ${items.length} 张的待修改标记。`);
}
function quickGroupButtons(kind){
  const isRef=kind==='reference',nextId=suggestGroupId();
  return state.groups.filter(g=>assetMode(g)===isRef).map(g=>`<button role="menuitem" data-quick="group" data-group="${esc(g.id)}" title="编入 ${esc(g.id)}" aria-label="编入 ${esc(g.id)}"><i style="background:${g.color}"></i><small>${esc(g.id)}</small></button>`).join('')+
    `<button role="menuitem" class="quick-new-group" data-quick="new-group" ${nextId?'':'disabled'} title="${nextId?'自动创建 '+nextId+'，分配未使用的新颜色':'自动组号已到上限'}" aria-label="新组"><i aria-hidden="true">＋</i><small>新组</small></button>`;
}
function applyQuickGroup(context,targetId){
  const isRef=context.kind==='reference';
  let g=targetId?state.groups.find(g=>g.id===targetId&&assetMode(g)===isRef):null;
  if(targetId&&!g)return toast('目标组已变化，请重新选择。');
  if(!context.ids.length||context.ids.some(id=>!itemFor(context.kind,id)))return toast('所选素材已变化，请重新选择。');
  if(g&&!isRef){assignToGroup(context.ids,g.id);lastCanvasGroup=g.id;syncQuickSelection();toast(`${context.ids.length} 张已编入 ${g.id}。`);return;}
  const newId=g?null:suggestGroupId(),newColor=g?null:suggestGroupColor();
  if(!g&&!newId)return toast('自动组号已到上限，请使用现有组。');
  const created=!g;
  record(isRef?'复用素材到资产组':'快速新建分镜组',()=>{
    if(!g){g={id:newId,color:newColor,members:[],referenceIds:[],inputMode:isRef?'assets':'storyboard',mode:isRef?'auto':'multi',intent:'',bridge:'',duration:''};reserveGroupId(g.id);state.groups.push(g);}
    if(isRef)g.referenceIds=[...new Set([...g.referenceIds,...context.ids])];
    else{state.groups.forEach(other=>other.members=other.members.filter(id=>!context.ids.includes(id)));g.members=context.ids.slice();state.groups=state.groups.filter(other=>other.members.length||assetMode(other)||other.referenceIds.length);}
    lastCanvasGroup=g.id;panel={type:'group',id:g.id};
  });toast(`${created?'新组 '+g.id+' 已建立 · ':''}${context.ids.length} 张${isRef?'已复用到':'已编入'} ${g.id}${created?'，已分配未使用的新颜色。':'。'}`);
}
function sortScope(context){
  if(context.kind==='reference'){const g=state.groups.find(g=>g.id===context.groupId);if(!assetMode(g)||context.ids.some(id=>!g.referenceIds.includes(id))){toast('请在同一个资产组内调整绑定顺序。');return null;}return {order:g.referenceIds.slice(),apply:order=>g.referenceIds=order};}
  let order=state.order.filter(shotIsActive);
  if((state.view||'groups')==='groups'){const groups=new Set(context.ids.map(id=>groupOf(id)?.id));if(groups.size!==1){toast('跨组整体调序，请先切换到“全部镜头”。');return null;}const gid=[...groups][0];order=order.filter(id=>groupOf(id)?.id===gid);}
  const positions=new Set(order);return {order,apply:next=>{let i=0;state.order=state.order.map(id=>positions.has(id)?next[i++]:id);}};
}
function shiftPicked(context,direction){
  const scope=sortScope(context);if(!scope)return;const next=scope.order.slice(),picked=new Set(context.ids);
  if(direction==='first'||direction==='last'){const selected=next.filter(id=>picked.has(id)),rest=next.filter(id=>!picked.has(id));next.splice(0,next.length,...(direction==='first'?[...selected,...rest]:[...rest,...selected]));}
  else if(direction==='earlier'){for(let i=1;i<next.length;i++)if(picked.has(next[i])&&!picked.has(next[i-1]))[next[i-1],next[i]]=[next[i],next[i-1]];}
  else{for(let i=next.length-2;i>=0;i--)if(picked.has(next[i])&&!picked.has(next[i+1]))[next[i],next[i+1]]=[next[i+1],next[i]];}
  if(next.join('|')===scope.order.join('|'))return toast('已经到达当前排列边界。');
  record('快速调整排列顺序',()=>scope.apply(next));toast('顺序已调整；固定编号和原图保留。');
}
function selectionContext(){return referenceSelection.size?{kind:'reference',ids:[...referenceSelection],groupId:lastCanvasGroup}:{kind:'shot',ids:[...selection]};}
async function pngForClipboard(data){
  const blob=await (await fetch(data)).blob();if(blob.type==='image/png')return blob;
  const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图片格式转换失败')),'image/png'));
}
async function copyOriginal(kind,id){
  if(copyBusy)return;const item=itemFor(kind,id),data=imageOf(item);if(!data)return toast('原图不可用，未复制。');copyBusy=true;
  try{
    if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('当前浏览器未提供图片剪贴板接口');
    toast('正在复制原图…');await navigator.clipboard.write([new ClipboardItem({'image/png':pngForClipboard(data)})]);
    closeQuickMenu();toast(`复制成功 · ${id} 原图已放入剪贴板，可 Ctrl+V 粘贴。`);
  }catch(error){
    closeQuickMenu();toast('未复制成功：浏览器未允许写入图片剪贴板。');
    modal(`<h2>图片尚未复制</h2><p class="note">当前环境没有允许系统图片剪贴板写入。可在下方原图上使用浏览器自己的“复制图片”，或下载后使用。不会将失败显示为成功。</p><img class="modal-image" src="${data}" alt="${esc(item.title)} 原图"><a href="${data}" download="${esc(media[item.assetId]?.name||'原图.png')}">下载原图</a>`);
  }finally{copyBusy=false;}
}
async function pasteImages(files,destination=pasteDestination()){
  const list=[...files];if(!list.length)return toast('剪贴板中没有可读取的图片，请先复制图片或截图。');
  if(pendingUploads)return toast('图片仍在载入，请稍后再粘贴。');
  if(list.length>20||list.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>25*1024*1024))return toast('一次最多粘贴 20 张 PNG、JPG 或 WebP，每张不超过 25 MB。');
  if(destination.kind==='reference'){
    const before=new Set(state.references.map(r=>r.id));referenceUploadTarget={groupId:destination.groupId,replaceId:null};await uploadReferences(list);
    const added=state.references.filter(r=>!before.has(r.id));if(added.length){lastCanvasGroup=destination.groupId;useSelection('reference',added.map(r=>r.id));}return;
  }
  if(state.shots.length+list.length>200)return toast('此样板最多保存 200 张分镜。');
  pendingUploads++;renderGate();toast(`正在粘贴 ${list.length} 张图片…`);
  try{
    const loaded=[];
    for(const file of list){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});const image=new Image();image.src=data;await image.decode();loaded.push({data,name:file.name||'粘贴图片.png'});}
    const group=state.groups.find(g=>g.id===destination.groupId);
    if(destination.groupId&&(!group||assetMode(group)))throw Error('目标组已改变，请重新选择粘贴位置。');
    const newIds=[];
    record('从剪贴板新增分镜',()=>{
      for(const item of loaded){const assetId='asset-'+uid();let id;do{id='补镜-'+String(state.nextShot++).padStart(2,'0');}while(shot(id));media[assetId]=item;state.shots.push({id,title:/^(image|clipboard|粘贴图片)\./i.test(item.name)?'粘贴图片 '+id:item.name.replace(/\.[^.]+$/,''),assetId,assetVersion:1,camera:DEFAULT_CAMERA,action:'',continuity:'',needsRevision:false});newIds.push(id);}
      const at=destination.after?state.order.indexOf(destination.after)+1:state.order.length;state.order.splice(at,0,...newIds);if(group)group.members.push(...newIds);selection=new Set(newIds);referenceSelection.clear();panel={type:'shot',id:newIds[0]};lastCanvasGroup=group?.id||null;
    });toast(`已粘贴 ${newIds.length} 张${group?'到 '+group.id:'新分镜'}；原图没有被覆盖。`);
  }catch(error){toast(error.message||'图片粘贴失败，原内容未更改。');}finally{pendingUploads--;renderGate();}
}
document.addEventListener('paste',event=>{
  if(isTextEditor(event.target)||$('modal').open)return;
  const files=[...(event.clipboardData?.items||[])].filter(item=>item.kind==='file').map(item=>item.getAsFile()).filter(Boolean);
  if(!files.length)return;event.preventDefault();closeQuickMenu();pasteImages(files);
});
$('board').addEventListener('contextmenu',event=>{const card=event.target.closest('.shot,.reference-card');if(!card||isTextEditor(event.target))return;event.preventDefault();showQuickMenu(card,event.clientX,event.clientY);});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-quick]');if(!button||!quickContext)return;const context={...quickContext,ids:quickContext.ids.slice()},action=button.dataset.quick;
  if(action==='copy'){copyOriginal(context.kind,context.focusId);return;}
  closeQuickMenu();
  if(action==='pending'||action==='restore')setPending(context,action==='pending');
  else if(action==='group'||action==='new-group')applyQuickGroup(context,action==='group'?button.dataset.group:null);
  else shiftPicked(context,action);
});
document.addEventListener('pointerdown',event=>{if(!$('quickMenu').hidden&&!event.target.closest('#quickMenu'))closeQuickMenu();});
$('quickMenu').addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeQuickMenu(true);return;}
  if(event.key==='Tab'){closeQuickMenu();return;}
  const buttons=[...$('quickMenu').querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
});
window.addEventListener('resize',()=>closeQuickMenu());
document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.isComposing||isTextEditor(event.target)||$('modal').open)return;
  if((event.ctrlKey||event.metaKey)&&!event.shiftKey&&!event.altKey&&event.key.toLowerCase()==='z'){
    event.preventDefault();closeQuickMenu();finishPaint();undoBoardChange();return;
  }
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='c'&&!window.getSelection()?.toString()){const context=selectionContext();if(context.ids.length===1){event.preventDefault();copyOriginal(context.kind,context.ids[0]);}}
  if(event.key==='Escape'){finishPaint();closeQuickMenu(true);}
  if(event.shiftKey&&event.key==='F10'){const card=event.target.closest('.shot,.reference-card');if(card){event.preventDefault();const r=card.getBoundingClientRect();showQuickMenu(card,r.left+20,r.top+20);}}
});

// 图片上的左键拖动按可见顺序扩展选择；排序只由独立手柄触发。
function paintAt(x,y){
  const gesture=paintGesture;if(!gesture)return;
  gesture.x=x;gesture.y=y;
  if(!gesture.moved&&Math.hypot(x-gesture.startX,y-gesture.startY)<6)return;
  gesture.moved=true;document.body.classList.add('is-painting');
  let selected=new Set(gesture.base);
  if(gesture.mode==='paint'){
    const card=document.elementFromPoint(x,y)?.closest('.shot,.reference-card');
    if(card&&cardKind(card)===gesture.kind){const index=gesture.order.indexOf(cardId(card));if(index>=0)gesture.end=index;}
    const from=Math.min(gesture.anchor,gesture.end),to=Math.max(gesture.anchor,gesture.end);
    for(const id of gesture.order.slice(from,to+1))gesture.add?selected.add(id):selected.delete(id);
  }else{
    const left=Math.min(x,gesture.startX),top=Math.min(y,gesture.startY),width=Math.abs(x-gesture.startX),height=Math.abs(y-gesture.startY);
    Object.assign($('marquee').style,{display:'block',left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
    $('board').querySelectorAll('.shot').forEach(card=>{const r=card.getBoundingClientRect();if(r.left<left+width&&r.right>left&&r.top<top+height&&r.bottom>top)selected.add(cardId(card));});
  }
  useSelection(gesture.kind,selected);
}
function paintAutoScroll(){
  if(!paintGesture?.moved||paintGesture.mode!=='paint')return;
  const y=paintGesture.y,delta=y<70?-Math.ceil((70-y)/5):y>innerHeight-70?Math.ceil((y-innerHeight+70)/5):0;
  if(delta){window.scrollBy(0,Math.max(-18,Math.min(18,delta)));paintAt(paintGesture.x,paintGesture.y);}
  paintScrollFrame=requestAnimationFrame(paintAutoScroll);
}
function finishPaint(){
  const gesture=paintGesture;if(!gesture)return;paintGesture=null;cancelAnimationFrame(paintScrollFrame);
  if(gesture.moved)suppressPaintClickUntil=performance.now()+400;
  if($('board').hasPointerCapture(gesture.pointerId))$('board').releasePointerCapture(gesture.pointerId);
  document.body.classList.remove('is-painting');$('marquee').style.display='none';syncQuickSelection();
}
$('board').addEventListener('pointerdown',event=>{
  if(event.button!==0||event.pointerType==='touch'||isTextEditor(event.target)||event.target.closest('button'))return;
  suppressPaintClickUntil=0;
  const thumb=event.target.closest('.thumb,.reference-thumb'),card=thumb?.closest('.shot,.reference-card');
  if(!card&&event.target.closest('.shot,.reference-card,.group-heading,.group-story'))return;
  const kind=card?cardKind(card):'shot',ids=visibleIds(kind),id=cardId(card),base=card||event.shiftKey?new Set(setFor(kind)):new Set();
  if(card)lastCanvasGroup=card.closest('[data-group]')?.dataset.group||groupOf(id)?.id||null;
  paintGesture={pointerId:event.pointerId,kind,mode:card?'paint':'marquee',order:ids,anchor:ids.indexOf(id),end:ids.indexOf(id),add:!base.has(id),base,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,moved:false};
  // 延迟捕获到真正开始拖动；短按仍由原生 click 切换单张。
  if(card)thumb.focus({preventScroll:true});
});
document.addEventListener('pointermove',event=>{
  if(!paintGesture||event.pointerId!==paintGesture.pointerId)return;
  if(!(event.buttons&1)){finishPaint();return;}
  const wasMoving=paintGesture.moved;paintAt(event.clientX,event.clientY);
  if(paintGesture.moved&&!wasMoving){$('board').setPointerCapture(event.pointerId);paintAutoScroll();}
  if(paintGesture.moved)event.preventDefault();
});
document.addEventListener('pointerup',event=>{if(paintGesture?.pointerId===event.pointerId)finishPaint();});
$('board').addEventListener('pointercancel',finishPaint);$('board').addEventListener('lostpointercapture',finishPaint);
window.addEventListener('blur',()=>{finishPaint();closeQuickMenu();});

// 六点手柄的提起、让位、落位反馈由拖动反馈.js 管理；图片区域继续专用于滑选。
