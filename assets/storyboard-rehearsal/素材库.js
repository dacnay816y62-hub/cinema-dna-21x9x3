// 本地目录分类与生成组用途相互独立；媒体共享，不移动或监控磁盘原文件。
let librarySelection=new Set(),libraryAnchor=null,libraryDragIds=[],libraryBusy=false,libraryProgress='';
const folderIcon='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 6h7l2 3h9v11H3z"/><path d="M3 6V4h7l2 3h8v2"/></svg>';
const libraryTrashIcon='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
function boundReference(g,id){const r=refAsset(id);if(!r)return null;const b=g.referenceBindings?.[id]||{};return {...r,role:b.role??r.role,scope:b.scope??r.scope,exclude:b.exclude??r.exclude,note:b.note||''};}
function ensureLibraryModel(){
  state.libraryFolders||=[];state.libraryUI||={folderId:'all',closedFolders:[],search:''};state.libraryUI.closedFolders||=[];
  // 从素材库删除，不连带删除故事镜头；记住已隐藏的镜头资产，避免刷新时自动补回。
  state.libraryHiddenShotAssets=(state.libraryHiddenShotAssets||[]).filter(id=>state.shots.some(s=>s.assetId===id));
  if(!['all','loose'].includes(state.libraryUI.folderId)&&!state.libraryFolders.some(f=>f.id===state.libraryUI.folderId))state.libraryUI.folderId='all';
  const represented=new Set(state.references.map(r=>r.assetId));
  for(const s of state.shots){if(represented.has(s.assetId)||state.libraryHiddenShotAssets.includes(s.assetId)||state.references.length>=200)continue;
    let folder=state.libraryFolders.find(f=>f.id==='folder-existing-shots');
    if(!folder&&state.libraryFolders.length<300){folder={id:'folder-existing-shots',name:'已有分镜',parentId:null};state.libraryFolders.push(folder);}
    state.references.push({id:newReferenceId(),title:s.title,role:'storyboard',scope:roleRules.storyboard[0],exclude:roleRules.storyboard[1],assetId:s.assetId,assetVersion:s.assetVersion,originShotId:s.id,needsRevision:s.needsRevision,folderId:folder?.id||null,sourcePath:media[s.assetId]?.name||s.title});represented.add(s.assetId);
  }
  for(const r of state.references){r.folderId??=null;r.sourcePath??=media[r.assetId]?.name||r.title;}
}
function folderPath(id){const parts=[],seen=new Set();while(id){if(seen.has(id))break;seen.add(id);const f=state.libraryFolders.find(f=>f.id===id);if(!f)break;parts.unshift(f.name);id=f.parentId;}return parts.join('/')||'未分类';}
function folderChildren(id){const found=new Set([id]);for(let n=0;n<16;n++){let changed=false;for(const f of state.libraryFolders)if(found.has(f.parentId)&&!found.has(f.id)){found.add(f.id);changed=true;}if(!changed)break;}return found;}
function libraryUsages(id){return state.groups.filter(g=>g.referenceIds.includes(id)).map(g=>({g,r:boundReference(g,id)}));}
function roleName(role){return roles.find(r=>r.id===role)?.name||'未标注';}
function libraryReferenceRequest(g,r,n){return {上传顺序:n,素材编号:r.id,名称:r.title,所属生成组:g.id,职责:roleName(r.role),只继承:r.scope,不继承:r.exclude,补充说明:r.note||'',文件夹路径:folderPath(r.folderId),原始相对路径:r.sourcePath,原始文件名:r.originalName||media[r.assetId]?.name,媒体编号:r.assetId,素材版本:r.assetVersion};}
function libraryCatalog(){return {文件夹:state.libraryFolders.map(f=>({编号:f.id,名称:f.name,父级:f.parentId,路径:folderPath(f.id)})),素材:state.references.map(r=>({素材编号:r.id,名称:r.title,文件夹路径:folderPath(r.folderId),原始相对路径:r.sourcePath,原始文件名:r.originalName||media[r.assetId]?.name,媒体编号:r.assetId,使用关系:libraryUsages(r.id).map(({g,r:bound})=>({组号:g.id,职责:roleName(bound.role),只继承:bound.scope,不继承:bound.exclude,补充说明:bound.note||''})),状态:r.needsRevision?'待修改':libraryUsages(r.id).length?'已关联':'仅入库，未关联生成组'}))};}
function supportAssetsSection(g){const list=refs(g);return `<div class="support-assets"><div class="row between"><span class="small">补充素材 <span class="muted">${list.length} 份 · 不计入镜头顺序</span></span><button data-lib-action="choose" data-group="${esc(g.id)}">＋ 从素材库添加</button></div>${list.length?`<div class="support-list">${list.map(r=>`<button class="support-item ${r.needsRevision?'needs-revision':''}" data-lib-action="bind-one" data-id="${esc(r.id)}" data-group="${esc(g.id)}"><img src="${imageOf(r)}" alt=""><span><b>${esc(g.id)} · ${esc(roleName(r.role))}</b><small>${esc(r.title)}</small></span></button>`).join('')}</div>`:'<p class="note">可拖入人物、场景、道具，再明确它在本组的职责。</p>'}</div>`;}
function visibleLibrary(){const u=state.libraryUI,q=(u.search||'').trim().toLocaleLowerCase(),ids=folderChildren(u.folderId);return state.references.filter(r=>(u.folderId==='all'||u.folderId==='loose'&&!r.folderId||ids.has(r.folderId))&&(!q||[r.title,r.sourcePath,folderPath(r.folderId),...libraryUsages(r.id).map(({g,r})=>g.id+' '+roleName(r.role))].join(' ').toLocaleLowerCase().includes(q)));}
function folderOptions(value,exclude){return '<option value="">未分类 / 根目录</option>'+state.libraryFolders.filter(f=>!exclude?.has(f.id)).map(f=>`<option value="${esc(f.id)}" ${f.id===value?'selected':''}>${esc(folderPath(f.id))}</option>`).join('');}
function renderFolderTree(){
  const u=state.libraryUI,closed=new Set(u.closedFolders),selectedAncestors=new Set();
  let parent=state.libraryFolders.find(f=>f.id===u.folderId)?.parentId;
  while(parent&&!selectedAncestors.has(parent)){selectedAncestors.add(parent);parent=state.libraryFolders.find(f=>f.id===parent)?.parentId;}
  const virtual=(id,name,count)=>`<div class="folder-row folder-virtual ${u.folderId===id?'active':''}" data-folder-row="${id}"><button class="folder-name" data-lib-action="folder" data-id="${id}" ${u.folderId===id?'aria-current="location"':''}>${folderIcon}<span>${name}</span><small>${count}</small></button></div>`;
  const branch=(parentId,depth,visited=new Set())=>state.libraryFolders.filter(f=>f.parentId===parentId&&!visited.has(f.id)).map(f=>{
    if(depth>16)return '';
    const child=state.libraryFolders.some(x=>x.parentId===f.id),expanded=child&&!closed.has(f.id),subId='folder-children-'+f.id;
    const count=state.references.filter(r=>folderChildren(f.id).has(r.folderId)).length;
    const nextVisited=new Set([...visited,f.id]);
    return `<li class="folder-node ${depth===0?'folder-root':''}" data-folder-node="${esc(f.id)}"><div class="folder-row ${u.folderId===f.id?'active':''} ${selectedAncestors.has(f.id)?'contains-current':''} ${expanded?'is-open':''}" data-folder-row="${esc(f.id)}" style="--depth:${depth}"><button class="folder-expand" data-lib-action="expand" data-id="${esc(f.id)}" aria-label="${expanded?'收起':'展开'} ${esc(f.name)}" ${child?`aria-expanded="${expanded}" aria-controls="${esc(subId)}"`:'disabled'}><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button><button class="folder-name" data-lib-action="folder" data-id="${esc(f.id)}" title="${esc(folderPath(f.id))}" ${u.folderId===f.id?'aria-current="location"':''}>${folderIcon}<span>${esc(f.name)}</span><small title="含子文件夹，共 ${count} 份素材">${count}</small></button><div class="folder-actions"><button class="folder-add" data-lib-action="new-child" data-id="${esc(f.id)}" aria-label="在 ${esc(f.name)} 中新建子文件夹" title="新建子文件夹">＋</button><button class="folder-more" data-lib-action="edit-folder" data-id="${esc(f.id)}" aria-label="编辑文件夹 ${esc(f.name)}" title="重命名 / 调整上级">⋯</button></div></div>${child?`<ul id="${esc(subId)}" class="folder-children" aria-label="${esc(f.name)} 的子文件夹" ${expanded?'':'hidden'}>${branch(f.id,depth+1,nextVisited)}</ul>`:''}</li>`;
  }).join('');
  $('folderTree').innerHTML=`<div class="folder-views">${virtual('all','所有素材',state.references.length)}${virtual('loose','未分类',state.references.filter(r=>!r.folderId).length)}</div><div class="folder-tree-label">项目目录</div><ul class="folder-tree-roots" aria-label="素材文件夹层级">${branch(null,0)}</ul>`;
}
function renderLibraryBreadcrumb(){
  const current=state.libraryUI.folderId;
  if(current==='all'||current==='loose'){$('libraryLocation').textContent=current==='all'?'所有素材':'未分类';return;}
  const chain=[],seen=new Set();let id=current;
  while(id&&!seen.has(id)){seen.add(id);const f=state.libraryFolders.find(f=>f.id===id);if(!f)break;chain.unshift(f);id=f.parentId;}
  $('libraryLocation').innerHTML=chain.map((f,i)=>`${i?'<span class="folder-breadcrumb-separator" aria-hidden="true">/</span>':''}<button data-lib-action="folder" data-id="${esc(f.id)}" ${f.id===current?'aria-current="location"':''} title="${esc(folderPath(f.id))}">${esc(f.name)}</button>`).join('');
}
function renderAssetLibrary(){
  const u=state.libraryUI,tree=$('folderTree');if(!tree)return;
  librarySelection=new Set([...librarySelection].filter(id=>refAsset(id)));
  renderFolderTree();
  $('libraryTotal').textContent=String(state.references.length).padStart(2,'0');
  if(document.activeElement!==$('librarySearch'))$('librarySearch').value=u.search||'';
  const list=visibleLibrary();
  renderLibraryBreadcrumb();
  $('libraryItems').innerHTML=list.map(r=>{const uses=libraryUsages(r.id);return `<article class="library-item ${librarySelection.has(r.id)?'selected':''} ${r.needsRevision?'needs-revision':''}" data-lib-id="${esc(r.id)}" draggable="true" tabindex="0" role="button" aria-pressed="${librarySelection.has(r.id)}" aria-label="选择素材 ${esc(r.title)}"><div class="library-thumb"><img loading="lazy" src="${imageOf(r)}" alt="${esc(r.title)}" draggable="false"><button type="button" class="library-trash" data-lib-action="delete-one" data-id="${esc(r.id)}" draggable="false" title="从素材库删除" aria-label="删除素材 ${esc(r.title)}">${libraryTrashIcon}</button><input type="checkbox" tabindex="-1" aria-label="选择 ${esc(r.title)}" ${librarySelection.has(r.id)?'checked':''}></div><div class="library-title" title="${esc(r.sourcePath)}">${esc(r.title)}</div><div class="library-usage">${r.needsRevision?'<span>待修改</span>':uses.length?uses.map(({g,r})=>`<span style="--group:${g.color}">${esc(g.id)} · ${esc(roleName(r.role).replace('资产',''))}</span>`).join(''):r.originShotId&&shot(r.originShotId)?.assetId===r.assetId?'<span>'+esc((groupOf(r.originShotId)?.id||'未编组')+' · 主分镜')+'</span>':'<span class="unbound">未关联</span>'}</div></article>`;}).join('')||'<div class="library-empty">把图片或文件夹拖到这里<br>也可使用上方导入按钮</div>';
  renderLibrarySelection();
  $('libraryProgress').textContent=libraryProgress||'本地保存 · 原文件不移动';
  $('libraryReport').hidden=!state.libraryLastImport;
}
function renderLibrarySelection(){
  $('libraryItems').querySelectorAll('[data-lib-id]').forEach(card=>{const selected=librarySelection.has(card.dataset.libId);card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected));card.querySelector('input').checked=selected;});
  const count=librarySelection.size;
  $('librarySelection').classList.toggle('has-selection',count>0);
  $('librarySelection').innerHTML=`<div class="row between library-selection-head"><span role="status" aria-live="polite">${count?'已选 '+count+' 份':'勾选图片可批量管理'}</span><div class="library-selection-actions">${count?`<button class="library-batch-delete" data-lib-action="delete-selected" title="删除所选 ${count} 份素材" aria-label="删除所选 ${count} 份素材">${libraryTrashIcon}</button>`:''}<button data-lib-action="clear" ${count?'':'disabled'}>取消选择</button></div></div><button class="library-bind" data-lib-action="bind" ${count?'':'disabled'}>标注用途 / 关联生成组</button><select id="libraryMove" aria-label="把所选素材移入文件夹" ${count?'':'disabled'}><option value="__choose">移入文件夹…</option>${folderOptions()}</select>`;
  $('libraryMove').onchange=e=>{if(e.target.value==='__choose')return;moveLibrary([...librarySelection],e.target.value||null);};
}
function setLibraryFolder(id){state.libraryUI.folderId=id;state.libraryUI.closedFolders=state.libraryUI.closedFolders.filter(x=>x!==id);librarySelection.clear();scheduleSave();renderAssetLibrary();}
function toggleLibrary(open=!document.body.classList.contains('library-open')){
  const wasOpen=document.body.classList.contains('library-open');
  document.body.classList.toggle('library-open',open);$('toggleLibrary').setAttribute('aria-expanded',String(open));
  if(open)$('librarySearch').focus({preventScroll:true});
  else if(wasOpen&&matchMedia('(max-width:1000px)').matches)$('toggleLibrary').focus({preventScroll:true});
}
function editLibraryFolder(id=null,parentOverride=undefined){
  const f=state.libraryFolders.find(x=>x.id===id),excluded=id?folderChildren(id):new Set(),current=state.libraryUI.folderId;
  const parent=f?f.parentId:parentOverride!==undefined?parentOverride:(state.libraryFolders.some(x=>x.id===current)?current:null);
  modal(`<h2>${f?'编辑':parent?'新建子':'新建'}文件夹</h2><p class="note">${parent?'创建于：'+esc(folderPath(parent))+'。':'创建于项目根目录。'}只调整本页分类，不重命名或移动磁盘文件。</p><label for="folderName">文件夹名称</label><input id="folderName" maxlength="80" value="${esc(f?.name||'')}"><label for="folderParent">上级文件夹</label><select id="folderParent">${folderOptions(parent,excluded)}</select><div class="dialog-actions"><button data-action="close">取消</button><button id="saveFolder">${f?'保存':'创建'}</button></div>`);
  $('folderName').focus();$('saveFolder').onclick=()=>{const name=$('folderName').value.trim(),parentId=$('folderParent').value||null;if(!name||/[\\/\u0000-\u001f]/.test(name))return toast('请输入有效名称，不含斜线或控制字符。');if(state.libraryFolders.some(x=>x.id!==id&&x.parentId===parentId&&x.name===name))return toast('同级已有这个文件夹，请换个名称。');if((folderPath(parentId).split('/').length+(id?Math.max(...[...excluded].map(x=>folderPath(x).split('/').length-folderPath(id).split('/').length)):0))>=16)return toast('文件夹最多 16 层。');if(!f&&state.libraryFolders.length>=300)return toast('文件夹上限为 300 个。');record(f?'调整素材文件夹':'新建素材文件夹',()=>{if(f){f.name=name;f.parentId=parentId;}else{const folder={id:'folder-'+uid(),name,parentId};state.libraryFolders.push(folder);state.libraryUI.folderId=folder.id;}state.libraryUI.closedFolders=[];});closeModal();};
}
function moveLibrary(ids,folderId){if(folderId&&!state.libraryFolders.some(f=>f.id===folderId))return;const list=ids.map(refAsset).filter(r=>r&&r.folderId!==folderId);if(!list.length)return;record('移动素材分类（原文件不动）',()=>list.forEach(r=>r.folderId=folderId));toast(list.length+' 份素材已移入 '+folderPath(folderId));}
function confirmLibraryDelete(ids){
  if(pendingUploads||libraryBusy)return toast('素材正在导入，完成后再删除。');
  const list=[...new Set(ids)].map(refAsset).filter(Boolean);if(!list.length)return;
  const selected=new Set(list.map(r=>r.id)),assets=new Set(list.map(r=>r.assetId));
  const affected=state.groups.filter(g=>g.referenceIds.some(id=>selected.has(id)));
  const retainedShots=state.shots.filter(s=>assets.has(s.assetId));
  const sourceState=state,revision=state.revision;
  closeQuickMenu();
  modal(`<div class="delete-dialog-heading">${libraryTrashIcon}<span>素材管理</span></div><h2>删除这 ${list.length} 份素材？</h2><p class="delete-description">将从本项目素材库移除，并解除${affected.length?' '+affected.map(g=>esc(g.id)).join('、')+' 中的参考关联':'已有参考关联'}。<strong>不会删除电脑里的原文件。</strong></p><ul class="delete-asset-list">${list.map(r=>`<li><img src="${imageOf(r)}" alt=""><div><b>${esc(r.title)}</b><small>${esc(folderPath(r.folderId))}</small></div></li>`).join('')}</ul>${affected.length?`<p class="delete-impact">影响 ${affected.length} 个生成组：${affected.map(g=>esc(g.id)).join('、')}。已有提示词保留，需重新核对素材引用。</p>`:'<p class="note">这些素材当前未关联生成组。</p>'}${retainedShots.length?`<p class="note">${retainedShots.length} 个已有分镜仍使用相同图像：镜头、编号和顺序全部保留，仅移除素材库条目与参考关联。</p>`:''}<p class="note">本次操作可用 Ctrl+Z / ⌘Z 撤销；刷新或关闭页面后，撤销记录不保留。</p><div class="dialog-actions"><button id="cancelLibraryDelete" data-action="close">取消</button><button id="confirmLibraryDelete" class="delete-confirm">${libraryTrashIcon}删除 ${list.length} 份</button></div>`);
  $('cancelLibraryDelete').focus();
  $('confirmLibraryDelete').onclick=()=>{
    if(state!==sourceState||state.revision!==revision||pendingUploads||libraryBusy){closeModal();return toast('素材状态已变化，请重新选择并确认删除。');}
    record('从素材库删除 '+list.length+' 份素材',()=>{
      state.libraryHiddenShotAssets=[...new Set([...(state.libraryHiddenShotAssets||[]),...retainedShots.map(s=>s.assetId)])];
      state.references=state.references.filter(r=>!selected.has(r.id));
      for(const g of affected){g.referenceIds=g.referenceIds.filter(id=>!selected.has(id));for(const id of selected)delete g.referenceBindings?.[id];}
      librarySelection=new Set([...librarySelection].filter(id=>!selected.has(id)));
      referenceSelection=new Set([...referenceSelection].filter(id=>!selected.has(id)));
      if(selected.has(libraryAnchor))libraryAnchor=null;
      if(panel.type==='reference'&&selected.has(panel.id))panel={type:'group',id:affected[0]?.id||state.groups[0]?.id};
    });
    closeModal();libraryProgress='已删除 '+list.length+' 份素材 · 原文件保留 · Ctrl+Z 可撤销';renderAssetLibrary();toast(libraryProgress);
    ($('libraryItems').querySelector('[data-lib-id]')||$('librarySearch')).focus({preventScroll:true});
  };
}
function setBoundReferenceRole(groupId,id,role){const g=state.groups.find(x=>x.id===groupId);if(!g||!g.referenceIds.includes(id)||!roles.some(x=>x.id===role))return;const r=boundReference(g,id);changeRole(r,role);record('修改 '+g.id+' 的素材职责',()=>g.referenceBindings[id]={role:r.role,scope:r.scope,exclude:r.exclude,note:r.note||''});}
function openLibraryChooser(groupId){
  modal(`<h2>为 ${esc(groupId)} 选择补充素材</h2><p class="note">先选择图片，下一步逐张指定人物、场景或道具。不会改变现有镜头顺序。</p><div class="reuse-list">${state.references.map(r=>`<label class="reuse-item"><input type="checkbox" data-library-pick="${esc(r.id)}"><img src="${imageOf(r)}" alt=""><span>${esc(r.title)}<small>${esc(folderPath(r.folderId))}</small></span></label>`).join('')}</div><div class="dialog-actions"><button data-action="close">返回</button><button id="chooseLibraryRefs">下一步 · 标注用途</button></div>`);
  $('chooseLibraryRefs').onclick=()=>{const ids=[...$('modalContent').querySelectorAll('[data-library-pick]:checked')].map(x=>x.dataset.libraryPick);if(!ids.length)return toast('请先选择素材。');openLibraryBinding(ids,groupId);};
}
function openLibraryBinding(ids,groupId){
  ids=[...new Set(ids)].filter(id=>refAsset(id));if(!ids.length)return;if(!state.groups.length)return toast('请先建立一个生成组。');
  const g=state.groups.find(g=>g.id===groupId)||state.groups.find(g=>g.id===state.libraryUI.targetGroup)||state.groups[0];
  modal(`<h2>标注素材用途</h2><p class="note">文件夹管分类；生成组管使用。相同素材可以用于多个组，各组职责独立。以下设置不改变镜号、分镜顺序或素材原图。</p><label for="libraryTarget">应用到生成组</label><select id="libraryTarget">${state.groups.map(x=>`<option value="${esc(x.id)}" ${x.id===g.id?'selected':''}>${esc(x.id)} · ${assetMode(x)?'资产＋剧情':'分镜＋补充参考'}</option>`).join('')}</select><div id="bindingRows">${ids.map(id=>{const r=boundReference(g,id),uses=libraryUsages(id);return `<section class="binding-row" data-binding="${esc(id)}" data-current-role="${esc(r.role)}"><div class="binding-preview"><img src="${imageOf(r)}" alt="${esc(r.title)}"><div><h3>${esc(r.title)}</h3><p class="note">${esc(folderPath(r.folderId))}<br>${esc(r.sourcePath)}</p><label>在 ${esc(g.id)} 中是<select data-binding-field="role">${options(roles,r.role)}</select></label></div></div><div class="binding-details"><label>只继承<textarea data-binding-field="scope">${esc(r.scope)}</textarea></label><label>不继承<textarea data-binding-field="exclude">${esc(r.exclude)}</textarea></label><label>本组补充说明<textarea data-binding-field="note" placeholder="例如：由女主手持；始终保持关闭状态。">${esc(r.note)}</textarea></label></div><p class="note">已关联：${uses.length?uses.map(({g,r})=>esc(g.id+' · '+roleName(r.role))).join(' / '):'无'}${g.referenceIds.includes(id)?` <button class="mini" data-lib-action="detach" data-id="${esc(id)}" data-group="${esc(g.id)}">从 ${esc(g.id)} 解除</button>`:''}</p></section>`;}).join('')}</div><div class="dialog-actions"><button data-action="close">取消</button><button id="addLibraryShots" ${assetMode(g)?'disabled':''}>另作新分镜添加</button><button id="saveLibraryBinding" class="primary">保存到 ${esc(g.id)}</button></div><p class="note">“另作新分镜添加”才会增加镜头；“保存”只关联参考用途。</p>`);
  $('libraryTarget').onchange=e=>openLibraryBinding(ids,e.target.value);
  $('bindingRows').onchange=e=>{if(e.target.dataset.bindingField!=='role')return;const row=e.target.closest('[data-binding]'),r={role:row.dataset.currentRole,scope:row.querySelector('[data-binding-field="scope"]').value,exclude:row.querySelector('[data-binding-field="exclude"]').value};changeRole(r,e.target.value);row.dataset.currentRole=r.role;for(const key of ['scope','exclude'])row.querySelector(`[data-binding-field="${key}"]`).value=r[key];};
  $('saveLibraryBinding').onclick=()=>{const entries=[...$('bindingRows').querySelectorAll('[data-binding]')].map(row=>({id:row.dataset.binding,...Object.fromEntries([...row.querySelectorAll('[data-binding-field]')].map(el=>[el.dataset.bindingField,el.value.trim()]))}));if(entries.some(x=>x.role==='unknown'||!x.scope))return toast('请为每张素材选择职责，并填写参考范围。');record('为 '+g.id+' 标注素材用途',()=>{for(const {id,...binding} of entries){if(!g.referenceIds.includes(id))g.referenceIds.push(id);g.referenceBindings[id]=binding;}state.libraryUI.targetGroup=g.id;panel={type:'group',id:g.id};});closeModal();toast('已关联到 '+g.id+'，用途会随提示词任务一起导出。');};
  $('addLibraryShots').onclick=()=>{if(assetMode(g))return;if(state.shots.length+ids.length>200)return toast('分镜数量最多 200 张。');record('从素材库添加新分镜',()=>{let at=members(g).length?state.order.indexOf(members(g).at(-1))+1:state.order.length;for(const rid of ids){const r=refAsset(rid);let id;do{id='补镜-'+String(state.nextShot++).padStart(2,'0');}while(shot(id));state.shots.push({id,title:r.title,assetId:r.assetId,assetVersion:r.assetVersion,camera:DEFAULT_CAMERA,action:'',continuity:'',needsRevision:r.needsRevision});state.order.splice(at++,0,id);g.members.push(id);}state.view='groups';panel={type:'group',id:g.id};});closeModal();toast('已增加新镜号，请补充剧情、时长与衔接。');};
}
function showImportReport(){const r=state.libraryLastImport;if(!r)return;modal(`<h2>最近一次导入</h2><p>${r.added} 份新增 · ${r.duplicates} 份同路径同内容重复 · ${r.skipped.length} 份跳过</p><p class="note">文件夹分类和原始相对路径已记录；没有修改磁盘源文件。</p>${r.skipped.length?'<ul>'+r.skipped.map(x=>`<li>${esc(x.path)}：${esc(x.reason)}</li>`).join('')+'</ul>':'<p>本次没有跳过项。</p>'}`);}
function libraryDestination(){return state.libraryFolders.some(f=>f.id===state.libraryUI.folderId)?state.libraryUI.folderId:null;}
async function importLibraryFiles(items,destination=libraryDestination(),directories=[],groupId=null){
  if(pendingUploads||libraryBusy)return toast('上一批素材仍在载入，请稍候。');if(!items.length&&!directories.length)return;
  const targetGroup=groupId?state.groups.find(g=>g.id===groupId):null;
  if(groupId&&!targetGroup)return toast('目标组已不存在，本批素材未导入。');
  const sourceState=state,sourceRevision=state.revision;libraryBusy=true;pendingUploads++;renderGate();const report={added:0,duplicates:0,skipped:[],groupId,linked:0,time:new Date().toISOString()},staged=[],accepted=[],folders=structuredClone(state.libraryFolders),known=[...state.references];let bytes=Object.values(media).reduce((n,m)=>n+(m.data?.length||0),0);const newMedia={};
  function targetFolder(path){const names=path.split('/').filter(Boolean).slice(0,-1);if(names.length>16)throw Error('目录层级超过 16 层');let parent=destination;if(parent&&folderPath(parent).split('/').length+names.length>16)throw Error('目录层级超过 16 层');for(const name of names){if(name.length>80||name==='..'||name==='.'||/[\u0000-\u001f]/.test(name))throw Error('目录名称不支持');let f=folders.find(x=>x.name===name&&x.parentId===parent);if(!f){if(folders.length>=300)throw Error('文件夹数量超过 300 个');f={id:'folder-'+uid(),name,parentId:parent};folders.push(f);}parent=f.id;}return parent;}
  try{
    if(!targetGroup)for(const path of directories){try{targetFolder(path+'/__empty');}catch(e){report.skipped.push({path,reason:e.message});}}
    for(let i=0;i<items.length;i++){const {file,path:raw}=items[i],path=(raw||file.webkitRelativePath||file.name).replace(/\\/g,'/');libraryProgress=`正在导入 ${i+1} / ${items.length} · ${file.name}`;$('libraryProgress').textContent=libraryProgress;
      try{if(!/\.(png|jpe?g|webp)$/i.test(file.name))throw Error('暂不支持此格式，仅支持 PNG / JPG / WebP');if(file.size>25*1024*1024)throw Error('单张超过 25 MB');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('无法读取文件'));reader.readAsDataURL(file);});const mime=/\.png$/i.test(file.name)?'png':/\.webp$/i.test(file.name)?'webp':'jpeg',normalized=data.replace(/^data:[^;]*;base64,/,`data:image/${mime};base64,`);await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{if(!im.width||!im.height)reject(Error('图片无法解码'));else resolve();};im.onerror=()=>reject(Error('图片无法解码'));im.src=normalized;});
        // 组内投放与当前侧栏目录无关：入库为未分类，随后关联落点组。
        const folderId=targetGroup?null:targetFolder(path),allMedia={...media,...newMedia};
        const same=Object.entries(allMedia).find(([,m])=>m.data===normalized);
        const existing=known.find(r=>r.folderId===folderId&&(r.originalName||allMedia[r.assetId]?.name)===file.name&&allMedia[r.assetId]?.data===normalized);
        if(existing){report.duplicates++;accepted.push(existing.id);continue;}
        if(known.length>=200)throw Error('素材总数达到 200 份上限');if(!same&&bytes+normalized.length>180*1024*1024)throw Error('本项目媒体达到 180 MB 便携文件安全上限');const assetId=same?.[0]||'asset-'+uid();if(!same){newMedia[assetId]={data:normalized,name:file.name};bytes+=normalized.length;}
        const baseTitle=file.name.replace(/\.[^.]+$/,'');let title=baseTitle,index=2;
        while(known.some(r=>r.title===title))title=baseTitle+'（'+index+++'）';
        const r={id:'素材-'+uid(),title,role:'unknown',scope:'',exclude:'',assetId,assetVersion:1,folderId,sourcePath:path,originalName:file.name,needsRevision:false};staged.push(r);known.push(r);accepted.push(r.id);report.added++;
      }catch(e){report.skipped.push({path,reason:e.message||'无法载入'});}
    }
    if(state!==sourceState||state.revision!==sourceRevision)throw Error('导入期间项目内容已变化，本批未写入，请重新导入。');
    const acceptedIds=[...new Set(accepted)],toLink=targetGroup?acceptedIds.filter(id=>!targetGroup.referenceIds.includes(id)):[];
    report.linked=toLink.length;
    if(staged.length||folders.length!==state.libraryFolders.length||toLink.length){record(targetGroup?'拖入素材到 '+groupId:'导入本地素材与文件夹',()=>{
      Object.assign(media,newMedia);state.references.push(...staged);state.libraryFolders=folders;state.libraryLastImport=report;state.libraryUI.search='';
      if(targetGroup){
        targetGroup.referenceBindings??={};
        for(const id of toLink){const r=refAsset(id);targetGroup.referenceIds.push(id);targetGroup.referenceBindings[id]={role:r.role,scope:r.scope,exclude:r.exclude,note:r.note||''};}
        state.libraryUI.folderId='loose';state.libraryUI.targetGroup=groupId;panel={type:'group',id:groupId};
      }else state.libraryUI.closedFolders=[];
    });librarySelection=new Set(acceptedIds);}else{state.libraryLastImport=report;scheduleSave();}
    libraryProgress=targetGroup&&acceptedIds.length?`${groupId}：已加入 ${toLink.length} 份 · 已在组内 ${acceptedIds.length-toLink.length} 份 · 所有素材 / 未分类`:`新增 ${report.added} · 重复 ${report.duplicates} · 跳过 ${report.skipped.length}`;
    const skipped=report.skipped.length?(targetGroup&&acceptedIds.length?'；跳过 '+report.skipped.length+' 份，可查看导入记录':'，可查看导入记录'):'';
    toast(libraryProgress+skipped+(targetGroup&&staged.length?'。请在卡片上标注人物 / 场景 / 道具。':''));
  }catch(e){libraryProgress=e.message;toast(e.message);}finally{libraryBusy=false;pendingUploads--;render();}
}
// DataTransfer entries must be captured in the drop handler before awaiting.
async function readDroppedEntries(entries,files){
  // 普通文件使用 drop 当场获取的 File，避免部分本地浏览器的 entry.file URI 兼容问题。
  if(files.length&&!entries.some(entry=>entry.isDirectory))return {items:files.map(file=>({file,path:file.webkitRelativePath||file.name})),directories:[]};
  const items=[],directories=[];let count=0;async function visit(entry,parent='',depth=0){if(++count>1200)throw Error('单次目录项超过 1200 个，请分批导入。');if(depth>16)throw Error('目录最多 16 层。');const path=parent+entry.name;if(entry.isFile){const file=await new Promise((res,rej)=>entry.file(res,rej));items.push({file,path});}else if(entry.isDirectory){directories.push(path);const reader=entry.createReader();for(;;){const batch=await new Promise((res,rej)=>reader.readEntries(res,rej));if(!batch.length)break;for(const child of batch)await visit(child,path+'/',depth+1);}}}
  if(entries.length){for(const entry of entries)await visit(entry);}else items.push(...files.map(file=>({file,path:file.webkitRelativePath||file.name})));return {items,directories};
}
function verifyLibraryImport(p){
  const s=p.state,folders=s.libraryFolders||[];if(!Array.isArray(folders)||folders.length>300)throw Error('文件夹资料格式有误。');const ids=new Set(),safeId=id=>typeof id==='string'&&/^[\w\u4e00-\u9fff-]{1,80}$/.test(id)&&!['__proto__','constructor','prototype','all','loose'].includes(id);
  for(const f of folders){if(!safeId(f.id)||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim()||f.name.length>80||/[\\/\u0000-\u001f]/.test(f.name))throw Error('文件夹编号或名称有误。');ids.add(f.id);}
  for(const f of folders){const seen=new Set([f.id]);let parent=f.parentId,depth=1;while(parent){if(!ids.has(parent)||seen.has(parent)||++depth>16)throw Error('文件夹存在循环、未知父级或过深嵌套。');seen.add(parent);parent=folders.find(x=>x.id===parent).parentId;}}
  for(const r of s.references||[]){if(!safeId(r.id)||r.folderId&&!ids.has(r.folderId))throw Error('素材所属文件夹有误。');for(const key of ['sourcePath','originalName'])if(r[key]!==undefined&&(typeof r[key]!=='string'||r[key].length>2000))throw Error('素材路径格式有误。');}
  if(s.libraryHiddenShotAssets!==undefined&&(!Array.isArray(s.libraryHiddenShotAssets)||s.libraryHiddenShotAssets.length>200||s.libraryHiddenShotAssets.some(id=>typeof id!=='string'||id.length>200)))throw Error('素材库删除记录格式有误。');
  for(const g of s.groups){if(g.referenceBindings!==undefined&&(!g.referenceBindings||typeof g.referenceBindings!=='object'||Array.isArray(g.referenceBindings)))throw Error('素材用途格式有误。');for(const [id,b] of Object.entries(g.referenceBindings||{})){if(!safeId(id)||!g.referenceIds?.includes(id)||!b||typeof b!=='object'||!roles.some(x=>x.id===b.role))throw Error('素材用途引用有误。');for(const k of ['scope','exclude','note'])if(typeof b[k]!=='string'||b[k].length>20000)throw Error('素材用途说明有误。');}}
  if(s.libraryUI){if(typeof s.libraryUI!=='object'||!Array.isArray(s.libraryUI.closedFolders)||s.libraryUI.closedFolders.some(id=>typeof id!=='string')||typeof s.libraryUI.search!=='string'||typeof s.libraryUI.folderId!=='string')throw Error('素材库界面状态有误。');}
  if(s.libraryLastImport){const r=s.libraryLastImport;if(!Number.isInteger(r.added)||!Number.isInteger(r.duplicates)||!Array.isArray(r.skipped)||r.skipped.length>2000||r.skipped.some(x=>!x||typeof x.path!=='string'||typeof x.reason!=='string'))throw Error('导入记录格式有误。');}
}
$('toggleLibrary').onclick=()=>toggleLibrary();$('closeLibrary').onclick=()=>toggleLibrary(false);$('libraryBackdrop').onclick=()=>toggleLibrary(false);
$('importFolder').onclick=()=>{if(!pendingUploads)$('libraryFolderInput').click();};$('importAssets').onclick=()=>{if(!pendingUploads)$('libraryFileInput').click();};
$('libraryFolderInput').onchange=e=>{const files=[...e.target.files];e.target.value='';importLibraryFiles(files.map(file=>({file,path:file.webkitRelativePath||file.name})));};
$('libraryFileInput').onchange=e=>{const files=[...e.target.files];e.target.value='';importLibraryFiles(files.map(file=>({file,path:file.name})));};
$('librarySearch').oninput=e=>{state.libraryUI.search=e.target.value;renderAssetLibrary();scheduleSave();};
$('libraryReport').onclick=showImportReport;
document.addEventListener('click',e=>{const el=e.target.closest('[data-lib-action]');if(!el)return;const {libAction:a,id,group}=el.dataset;
  if(a==='delete-one'){e.preventDefault();confirmLibraryDelete([id]);return;}
  if(a==='delete-selected'){e.preventDefault();confirmLibraryDelete([...librarySelection]);return;}
  if(a==='folder')setLibraryFolder(id);if(a==='expand'){const set=new Set(state.libraryUI.closedFolders);set.has(id)?set.delete(id):set.add(id);state.libraryUI.closedFolders=[...set];scheduleSave();renderAssetLibrary();[...$('folderTree').querySelectorAll('[data-lib-action="expand"]')].find(b=>b.dataset.id===id)?.focus({preventScroll:true});}
  if(a==='new-child')editLibraryFolder(null,id);
  if(a==='new-folder')editLibraryFolder();if(a==='edit-folder')editLibraryFolder(id);if(a==='clear'){librarySelection.clear();renderAssetLibrary();}
  if(a==='bind')openLibraryBinding([...librarySelection]);if(a==='bind-one')openLibraryBinding([id],group);if(a==='choose')openLibraryChooser(group);
  if(a==='detach'){const g=state.groups.find(x=>x.id===group);record('解除素材与 '+group+' 的关联',()=>{g.referenceIds=g.referenceIds.filter(x=>x!==id);delete g.referenceBindings[id];});closeModal();toast('关联已解除，素材和原图保留。');}
});
function selectLibraryCard(card,e){const id=card.dataset.libId,list=visibleLibrary().map(r=>r.id);if(e.shiftKey&&libraryAnchor&&list.includes(libraryAnchor)){const a=list.indexOf(id),b=list.indexOf(libraryAnchor);librarySelection=new Set(list.slice(Math.min(a,b),Math.max(a,b)+1));}else if(e.ctrlKey||e.metaKey||e.target.tagName==='INPUT'){librarySelection.has(id)?librarySelection.delete(id):librarySelection.add(id);}else librarySelection=new Set([id]);libraryAnchor=id;renderLibrarySelection();requestAnimationFrame(()=>$('libraryItems').querySelector(`[data-lib-id="${id}"]`)?.focus({preventScroll:true}));}
$('libraryItems').addEventListener('click',e=>{if(e.target.closest('button'))return;const card=e.target.closest('[data-lib-id]');if(card)selectLibraryCard(card,e);});
$('libraryItems').addEventListener('keydown',e=>{if(e.target.closest('button'))return;const card=e.target.closest('[data-lib-id]');if(card&&['Enter',' '].includes(e.key)){e.preventDefault();selectLibraryCard(card,e);}});
$('libraryItems').addEventListener('dblclick',e=>{if(e.target.closest('button,input'))return;const card=e.target.closest('[data-lib-id]');if(card)openLibraryBinding([card.dataset.libId]);});
$('libraryItems').addEventListener('contextmenu',e=>{const card=e.target.closest('[data-lib-id]');if(!card)return;e.preventDefault();const id=card.dataset.libId;openLibraryBinding(librarySelection.has(id)?[...librarySelection]:[id]);});
$('assetSidebar').addEventListener('paste',e=>{if(isTextEditor(e.target)||$('modal').open)return;const files=[...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/'));if(!files.length)return;e.preventDefault();e.stopPropagation();importLibraryFiles(files.map(file=>({file,path:file.name})));});
$('libraryItems').addEventListener('dragstart',e=>{if(e.target.closest('button,input')){e.preventDefault();return;}const card=e.target.closest('[data-lib-id]');if(!card)return;const id=card.dataset.libId;libraryDragIds=librarySelection.has(id)?[...librarySelection]:[id];e.dataTransfer.setData('application/x-fantasy-library',JSON.stringify(libraryDragIds));e.dataTransfer.effectAllowed='copyMove';card.classList.add('library-dragging');});
function clearLibraryDrop(){document.querySelectorAll('.library-drop-target,.library-dragging').forEach(x=>{x.classList.remove('library-drop-target','library-dragging');delete x.dataset.libraryDropLabel;});}
document.addEventListener('dragend',()=>{libraryDragIds=[];clearLibraryDrop();});
function libraryDropTarget(target){const folder=target.closest('[data-folder-row]');if(folder)return {el:folder,folder:folder.dataset.folderRow};if(target.closest('#assetSidebar'))return {el:$('libraryItems'),folder:state.libraryUI.folderId};const group=target.closest('.group-section[data-group],.group-chip[data-id]');if(group)return {el:group,group:group.dataset.group||group.dataset.id};const card=target.closest('.shot[data-id]');if(card&&groupOf(card.dataset.id))return {el:card,group:groupOf(card.dataset.id).id};return null;}
document.addEventListener('dragover',e=>{
  const types=[...(e.dataTransfer?.types||[])],internal=types.includes('application/x-fantasy-library'),files=types.includes('Files'),target=libraryDropTarget(e.target);
  if(!internal&&!files)return;
  // 外部文件默认行为会打开图片，整个页面都拦截，只有有效落点才接收。
  if(files)e.preventDefault();
  document.querySelectorAll('.library-drop-target').forEach(x=>{x.classList.remove('library-drop-target');delete x.dataset.libraryDropLabel;});
  if(!target||$('modal').open){e.dataTransfer.dropEffect='none';return;}
  e.preventDefault();e.dataTransfer.dropEffect=files||target.group?'copy':'move';target.el.classList.add('library-drop-target');
  if(files&&target.group)target.el.dataset.libraryDropLabel='松手加入 '+target.group+' · 同步到未分类';
});
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)clearLibraryDrop();});
document.addEventListener('drop',e=>{
  const transfer=e.dataTransfer;if(!transfer)return;const target=libraryDropTarget(e.target);clearLibraryDrop();
  const hasFiles=[...transfer.types].includes('Files');if(hasFiles)e.preventDefault();
  if($('modal').open){if(hasFiles)toast('请先关闭当前弹窗，再拖入目标组。');return;}
  if(!target){if(hasFiles)toast('请把图片拖入目标生成组，或拖到左侧素材库。');return;}
  const raw=transfer.getData('application/x-fantasy-library');
  if(raw){e.preventDefault();try{const ids=JSON.parse(raw).filter(id=>refAsset(id));if(target.group)openLibraryBinding(ids,target.group);else moveLibrary(ids,['all','loose'].includes(target.folder)?null:target.folder);}catch{}libraryDragIds=[];return;}
  if(!hasFiles)return;
  const files=[...transfer.files];if(!files.length&&!transfer.items.length)return;
  const entries=[...transfer.items].map(x=>(x.getAsEntry||x.webkitGetAsEntry)?.call(x)).filter(Boolean);
  const destination=target.group||['all','loose'].includes(target.folder)?null:target.folder;
  readDroppedEntries(entries,files).then(({items,directories})=>importLibraryFiles(items,destination,directories,target.group||null)).catch(error=>toast(error.message||'文件夹无法读取，请使用导入按钮。'));
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').open)toggleLibrary(false);});
// 窄屏抽屉打开时，Tab 留在当前操作层；原生弹窗打开后由弹窗接管焦点。
$('assetSidebar').addEventListener('keydown',e=>{
  if(e.key!=='Tab'||$('modal').open||!document.body.classList.contains('library-open')||!matchMedia('(max-width:1000px)').matches)return;
  const stops=[...$('assetSidebar').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.tabIndex>=0&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const first=stops[0],last=stops.at(-1);if(!first)return;
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
matchMedia('(max-width:1000px)').addEventListener('change',e=>{
  if(!e.matches)toggleLibrary(false);
  else if(!document.body.classList.contains('library-open')&&$('assetSidebar').contains(document.activeElement))$('toggleLibrary').focus({preventScroll:true});
});
$('assetSidebar').addEventListener('keydown',e=>{if(isTextEditor(e.target)||$('modal').open||!(e.ctrlKey||e.metaKey))return;if(e.key.toLowerCase()==='a'){e.preventDefault();e.stopPropagation();librarySelection=new Set(visibleLibrary().map(r=>r.id));renderLibrarySelection();}if(e.key.toLowerCase()==='c'){e.preventDefault();e.stopPropagation();if(librarySelection.size===1)copyOriginal('reference',[...librarySelection][0]);else toast('请选中一张素材再复制。');}});
$('assetSidebar').addEventListener('keydown',e=>{if(e.key!=='Delete'||isTextEditor(e.target)||$('modal').open||e.ctrlKey||e.metaKey||e.altKey)return;if(librarySelection.size){e.preventDefault();e.stopPropagation();confirmLibraryDelete([...librarySelection]);}});
