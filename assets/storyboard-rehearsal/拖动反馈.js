/* 卡片调序：手柄提起 → 浮层跟手 → 邻卡让位 → 松手落位。
 * 预览只移动 DOM，松手才提交一次 record；取消不动项目数据。
 * 固定初始槽位用于碰撞，避免让位动画反复触发换位。
 */
let sortScrollFrame=0,sortClickUntil=0;
const sortReducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function dragHandleMarkup(id,referenceGroup){
  return `<button class="drag" type="button" ${referenceGroup?`data-drag-reference="${esc(id)}" data-ref-group="${esc(referenceGroup)}"`:`data-drag="${esc(id)}"`} aria-label="移动 ${esc(id)}：按住拖动，或用方向键前后移动" aria-haspopup="menu" title="按住拖动 · 方向键移动 · 单击打开操作"><svg width="18" height="22" viewBox="0 0 18 22" fill="currentColor" aria-hidden="true"><circle cx="6" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="6" cy="11" r="1.6"/><circle cx="12" cy="11" r="1.6"/><circle cx="6" cy="17" r="1.6"/><circle cx="12" cy="17" r="1.6"/></svg></button>`;
}
function sortCard(kind,id,groupId){
  return [...$('board').querySelectorAll(kind==='reference'?'.reference-card':'.shot')].find(el=>cardId(el)===id&&(kind!=='reference'||el.dataset.refGroup===groupId));
}
function sortContext(handle){
  const kind=handle.hasAttribute('data-drag-reference')?'reference':'shot',id=handle.dataset.dragReference||handle.dataset.drag;
  if(!setFor(kind).has(id))useSelection(kind,[id]);
  return {kind,focusId:id,ids:visibleIds(kind).filter(key=>setFor(kind).has(key)),groupId:handle.dataset.refGroup||groupOf(id)?.id};
}
function startCardSort(d){
  $('board').setPointerCapture(d.pointerId);
  d.phase='moving';d.next=d.scope.order.slice();d.picked=d.scope.order.filter(id=>d.ids.includes(id));
  d.rest=d.scope.order.filter(id=>!d.ids.includes(id));d.anchor=d.picked.indexOf(d.focusId);
  d.cards=new Map(d.scope.order.map(id=>[id,sortCard(d.kind,id,d.groupId)]));
  d.nodes=new Map([...d.cards].map(([id,card])=>[id,d.kind==='shot'?card.parentElement:card]));
  d.container=d.nodes.get(d.focusId).parentElement;d.children=[...d.container.children];
  d.slotRects=d.scope.order.map(id=>{const r=d.cards.get(id).getBoundingClientRect();return {left:r.left+scrollX,top:r.top+scrollY,right:r.right+scrollX,bottom:r.bottom+scrollY};});
  d.nodeStyles=new Map([...d.nodes.values()].map(node=>[node,{height:node.style.height,rect:node.getBoundingClientRect()}]));
  d.minHeight=d.container.style.minHeight;d.container.style.minHeight=d.container.getBoundingClientRect().height+'px';
  d.nodeStyles.forEach((saved,node)=>node.style.height=saved.rect.height+'px');
  d.animations=new Map();
  const source=d.cards.get(d.focusId),r=source.getBoundingClientRect();
  d.offsetX=d.startX-r.left;d.offsetY=d.startY-r.top;
  const overlay=document.createElement('div');overlay.className='sort-overlay';overlay.setAttribute('aria-hidden','true');overlay.inert=true;
  overlay.style.width=r.width+'px';overlay.style.setProperty('--group',getComputedStyle(source).getPropertyValue('--group'));
  if(d.picked.length>1)overlay.classList.add('sort-stack');
  const clone=source.cloneNode(true);clone.classList.remove('sort-armed','selected');clone.classList.add('sort-ghost');
  clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));overlay.append(clone);
  const badge=document.createElement('span');badge.className='sort-count';badge.textContent=d.picked.length>1?`${d.picked.length} 张一起移动`:`移动 ${d.focusId}`;overlay.append(badge);
  document.body.append(overlay);d.overlay=overlay;
  d.status=document.createElement('div');d.status.className='sort-status';d.status.setAttribute('role','status');d.status.setAttribute('aria-live','polite');document.body.append(d.status);
  d.picked.forEach((id,i)=>{const card=d.cards.get(id);card.classList.add('sort-placeholder');card.dataset.dropLabel=i===0?(d.picked.length>1?`松手放置这 ${d.picked.length} 张`:'松手放在这里'):`同批移动 · ${id}`;});
  document.body.classList.add('is-sorting');d.container.classList.add('sort-scope');
  updateCardSort(d.x,d.y);sortAutoScroll();
}
function previewCardOrder(d,next){
  if(next.join('|')===d.next.join('|'))return;
  const before=new Map([...d.nodes].map(([id,node])=>[id,node.getBoundingClientRect()]));
  d.animations.forEach(animation=>animation.cancel());d.animations.clear();
  const sortable=new Set(d.nodes.values());let i=0;
  const children=d.children.map(node=>sortable.has(node)?d.nodes.get(next[i++]):node);
  d.container.append(...children);d.next=next;
  if(sortReducedMotion())return;
  d.nodes.forEach((node,id)=>{
    if(d.picked.includes(id))return;
    const a=before.get(id),b=node.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;
    if(Math.abs(dx)+Math.abs(dy)<1)return;
    d.animations.set(id,node.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:200,easing:'cubic-bezier(.2,.8,.2,1)'}));
  });
}
function updateCardSort(x,y){
  const d=dragging;if(!d||d.phase!=='moving')return;d.x=x;d.y=y;
  d.overlay.style.transform=`translate3d(${x-d.offsetX}px,${y-d.offsetY-7}px,0)`;
  const bounds=d.container.getBoundingClientRect();
  d.valid=x>=bounds.left-12&&x<=bounds.right+12&&y>=bounds.top-12&&y<=bounds.bottom+12&&x>=0&&x<=innerWidth&&y>=0&&y<=innerHeight;
  d.overlay.classList.toggle('sort-outside',!d.valid);d.container.classList.toggle('sort-invalid',!d.valid);
  if(!d.valid){d.status.textContent='移回当前区域放置 · 松手取消 · Esc 取消';return;}
  const px=x+scrollX,py=y+scrollY;
  let nearest=0,best=Infinity;
  d.slotRects.forEach((r,i)=>{
    const dx=Math.max(r.left-px,0,px-r.right),dy=Math.max(r.top-py,0,py-r.bottom);
    const distance=dx*dx+dy*dy;
    if(distance<best){best=distance;nearest=i;}
  });
  // 非连续多选也按原内部顺序合成一块；抓住哪一张，就以它作为指针锚点。
  const at=Math.max(0,Math.min(d.rest.length,nearest-d.anchor));
  const next=d.rest.slice();next.splice(at,0,...d.picked);previewCardOrder(d,next);
  const start=d.scope.order.indexOf(d.focusId)+1,end=d.next.indexOf(d.focusId)+1;
  const text=`${d.picked.length>1?'整批 '+d.picked.length+' 张':d.focusId} · 第 ${start} → ${end} 位　｜　松手放置 · Esc 取消`;
  if(d.status.textContent!==text)d.status.textContent=text;
}
function sortAutoScroll(){
  const d=dragging;if(!d||d.phase!=='moving')return;
  const r=d.container.getBoundingClientRect();
  if(d.x>=r.left-12&&d.x<=r.right+12){
    const speed=d.y<64?-Math.min(18,(64-d.y)/4):d.y>innerHeight-64?Math.min(18,(d.y-innerHeight+64)/4):0;
    if(speed)window.scrollBy(0,speed);
  }
  if(d.lastScrollX!==scrollX||d.lastScrollY!==scrollY){d.lastScrollX=scrollX;d.lastScrollY=scrollY;updateCardSort(d.x,d.y);}
  sortScrollFrame=requestAnimationFrame(sortAutoScroll);
}
function finishCardSort(cancel=false){
  const d=dragging;if(!d?.phase)return;dragging=null;cancelAnimationFrame(sortScrollFrame);
  d.handle.classList.remove('is-armed');d.source.classList.remove('sort-armed');
  if($('board').hasPointerCapture(d.pointerId))$('board').releasePointerCapture(d.pointerId);
  if(d.phase!=='moving')return;
  sortClickUntil=performance.now()+450;
  const commit=!cancel&&d.valid,changed=commit&&d.next.join('|')!==d.scope.order.join('|');
  d.animations.forEach(animation=>animation.cancel());
  if(!commit)d.container.append(...d.children);
  d.nodeStyles.forEach((saved,node)=>node.style.height=saved.height);
  d.container.style.minHeight=d.minHeight;d.container.classList.remove('sort-scope','sort-invalid');
  d.cards.forEach(card=>{card.classList.remove('sort-placeholder');delete card.dataset.dropLabel;});
  document.body.classList.remove('is-sorting');d.status.remove();
  if(changed)record('拖动调整排列顺序',()=>d.scope.apply(d.next));
  scheduleJunctionLayout();
  const landed=sortCard(d.kind,d.focusId,d.groupId);
  const handle=landed?.querySelector('.drag');handle?.focus({preventScroll:true});
  const endAnimation=()=>{d.overlay.remove();if(changed){d.picked.forEach(id=>{const card=sortCard(d.kind,id,d.groupId);card?.classList.add('sort-landed');setTimeout(()=>card?.classList.remove('sort-landed'),650);});}};
  if(landed&&!sortReducedMotion()){
    const target=landed.getBoundingClientRect(),current=d.overlay.getBoundingClientRect();
    const animation=d.overlay.animate([{transform:`translate3d(${current.left}px,${current.top}px,0)`,opacity:1},{transform:`translate3d(${target.left}px,${target.top}px,0)`,opacity:0}],{duration:190,easing:'cubic-bezier(.2,.8,.2,1)'});
    animation.onfinish=endAnimation;animation.oncancel=endAnimation;
  }else endAnimation();
  toast(changed?`已移动 ${d.picked.length} 张 · ${d.focusId} 位于第 ${d.next.indexOf(d.focusId)+1} 位 · 可撤销`:(commit?'已放回原位，顺序未变。':'已取消移动，顺序未变。'));
}
$('board').addEventListener('pointerdown',event=>{
  const handle=event.target.closest('[data-drag],[data-drag-reference]');
  if(!handle||event.button!==0||dragging)return;
  event.preventDefault();finishPaint();closeQuickMenu();sortClickUntil=0;
  const context=sortContext(handle),scope=sortScope(context);if(!scope)return;
  if(scope.order.length<2){toast('当前区域只有一张，无需调整位置。');return;}
  lastCanvasGroup=context.groupId;
  const source=handle.closest('.shot,.reference-card');
  dragging={...context,scope,source,handle,pointerId:event.pointerId,phase:'armed',startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY};
  handle.classList.add('is-armed');source.classList.add('sort-armed');handle.focus({preventScroll:true});
});
document.addEventListener('pointermove',event=>{
  const d=dragging;if(!d?.phase||event.pointerId!==d.pointerId)return;
  if(!(event.buttons&1)){finishCardSort(true);return;}
  d.x=event.clientX;d.y=event.clientY;
  if(d.phase==='armed'&&Math.hypot(d.x-d.startX,d.y-d.startY)>=4)startCardSort(d);
  if(d.phase==='moving'){event.preventDefault();updateCardSort(d.x,d.y);}
},{passive:false});
document.addEventListener('pointerup',event=>{if(dragging?.pointerId===event.pointerId){if(dragging.phase==='moving')updateCardSort(event.clientX,event.clientY);finishCardSort();}});
$('board').addEventListener('pointercancel',()=>finishCardSort(true));
$('board').addEventListener('lostpointercapture',()=>finishCardSort(true));
$('board').addEventListener('dragstart',event=>event.preventDefault());
window.addEventListener('blur',()=>finishCardSort(true));
window.addEventListener('resize',()=>finishCardSort(true));
document.addEventListener('keydown',event=>{
  if(dragging?.phase){
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finishCardSort(true);}
    else if(!['Shift','Control','Alt','Meta'].includes(event.key))finishCardSort(true);
    return;
  }
  const handle=event.target.closest('[data-drag],[data-drag-reference]');
  if(!handle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  event.preventDefault();const context=sortContext(handle);
  shiftPicked(context,event.key==='Home'?'first':event.key==='End'?'last':['ArrowLeft','ArrowUp'].includes(event.key)?'earlier':'later');
  sortCard(context.kind,context.focusId,context.groupId)?.querySelector('.drag')?.focus({preventScroll:true});
},true);
document.addEventListener('click',event=>{
  if(event.detail!==0&&performance.now()<sortClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
  const handle=event.target.closest('[data-drag],[data-drag-reference]');if(!handle)return;
  const r=handle.getBoundingClientRect();showQuickMenu(handle.closest('.shot,.reference-card'),r.left,r.bottom+6);
},true);
// 只吞掉本次拖动尾随的 click；用户下一次真实按下立即恢复，不妨碍快速连续操作。
document.addEventListener('pointerdown',()=>{if(!dragging)sortClickUntil=0;},true);
