// 通用混合流程：分镜编号、素材顺序和生成任务时间线分别维护。
function sciCanonical(v){return JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,k)=>(o[k]=x[k],o),{}):x);}
function sciPick(o,keys){return Object.fromEntries(keys.map(k=>[k,o[k]??'']));}
function sciLink(a,b){return (state.taskLinks||[]).find(e=>e.from===a&&e.to===b);}
function sciBasis(g){
 const index=state.groups.indexOf(g),ids=members(g);
 return {...sciPick(g,['id','inputMode','mode','duration','visualStyle','cameraPlan','soundPlan','startState','endState']),
  previous:state.groups[index-1]?.id||'',next:state.groups[index+1]?.id||'',
  links:(state.taskLinks||[]).filter(e=>e.from===g.id||e.to===g.id),
  shots:assetMode(g)?[]:ids.map(id=>sciPick(shot(id),['id','title','assetId','assetVersion','camera','action','continuity','needsRevision'])),
  edges:assetMode(g)?[]:ids.slice(1).map((id,i)=>state.edges[pairKey(ids[i],id)]),
  references:refs(g).map(r=>sciPick(r,['id','title','assetId','assetVersion','role','scope','exclude','note','needsRevision']))};
}
function sciFresh(g){return g.promptSource==='agent'&&g.promptBasis&&sciCanonical(g.promptBasis)===sciCanonical(sciBasis(g));}
function sciInputs(g){return [...(assetMode(g)?[]:members(g).map(id=>({name:media[shot(id).assetId]?.name.replace(/\.[^.]+$/,'')||shot(id).title,role:'主分镜 · '+id}))),...refs(g).map(r=>({name:r.title,role:roleName(r.role)}))];}
const sciOriginalStatus=groupPromptStatus;
groupPromptStatus=function(g){return g.promptSource==='agent'?(sciFresh(g)?'完整正文 · 已对应本组画面与资产':'画面、顺序或要求已变更 · 正文待更新'):sciOriginalStatus(g);};
const sciOriginalReference=libraryReferenceRequest;
libraryReferenceRequest=function(g,r,n){return {...sciOriginalReference(g,r,n),提示词引用标记:'@'+r.title,绑定边界:'普通文字不等于平台附件；上传原名文件后选择同名素材标签。'};};
const sciOriginalCompile=compileRequest;
compileRequest=function(){const result=sciOriginalCompile();result.组间衔接=state.groups.slice(1).map((b,i)=>sciLink(state.groups[i].id,b.id)||{from:state.groups[i].id,to:b.id,状态:'顺序已变更，需补写两组之间的起止状态'});result.编号规则='剧本段落与动作点编号固定；A1等是生成任务编号。资产组同样占据故事时间线，不因没有分镜图而跳过。';result.实名引用='分镜和辅助资产都使用同名@引用；复制文字后须确认外部平台实际绑定，不能仅凭@文字声称绑定成功。';result.分组.forEach((r,i)=>{r.起始状态=state.groups[i].startState||'';r.结束状态=state.groups[i].endState||'';r.剧本段落=state.groups[i].segmentId||'';r.固定动作编号=state.groups[i].beatIds||[];r.上传引用对照=sciInputs(state.groups[i]).map((x,n)=>({顺序:n+1,名称:x.name,标记:'@'+x.name,职责:x.role}));});return result;};
const sciOriginalValidate=validate;
validate=function(){const result=sciOriginalValidate();for(const g of state.groups){if(g.promptSource!=='agent')continue;if(!sciFresh(g))result.errors.push(g.id+' 现有画面／资产／顺序与正文依据不同，请更新后再确认。');const inputs=sciInputs(g);if(new Set(inputs.map(x=>x.name)).size!==inputs.length)result.errors.push(g.id+' 引用名称重复，请区分后绑定。');for(const x of inputs)if(!groupPromptText(g).includes('@'+x.name))result.errors.push(g.id+' 正文缺少实名引用 @'+x.name);}for(let i=1;i<state.groups.length;i++)if(!sciLink(state.groups[i-1].id,state.groups[i].id))result.warnings.push(state.groups[i-1].id+' → '+state.groups[i].id+' 是新的任务连接，请补审起止状态。');return result;};
const sciOriginalCard=referenceCard;
referenceCard=function(r,g){let html=sciOriginalCard(r,g);html=html.replace('<h3>'+esc(r.title)+'</h3>','<h3 class="asset-mention">@'+esc(r.title)+'</h3>').replace('<span class="tag">'+esc(r.id)+'</span>','<span class="tag">'+esc(roleName(r.role))+'</span>');const m=media[r.assetId];if(m)html=html.replace('<div class="row">','<p class="asset-file-name">'+esc(m.name)+'</p><a class="asset-download" download="'+esc(m.name)+'" href="'+imageOf(r)+'">下载原图</a><div class="row">');return html;};
const sciOriginalInspector=renderInspector;
renderInspector=function(){sciOriginalInspector();if(panel.type!=='group')return;const g=state.groups.find(x=>x.id===panel.id);if(!g)return;const box=$('inspector'),body=$('groupPrompt')?.closest('.group-prompt-field');if(!body)return;
 const binding=document.createElement('section');binding.className='named-binding';binding.style.setProperty('--group',g.color);binding.innerHTML='<p class="eyebrow">'+esc(g.id)+' · 按此顺序上传同名素材</p>'+sciInputs(g).map((x,i)=>'<div><span>'+String(i+1).padStart(2,'0')+'</span><b>@'+esc(x.name)+'</b><small>'+esc(x.role)+'</small></div>').join('');
 const settings=document.createElement('details');settings.className='case-settings';settings.innerHTML='<summary>编辑组设置、时长与素材职责</summary>';for(const child of [...box.children])if(child!==body)settings.append(child);
 const handoff=document.createElement('details');handoff.className='case-settings';handoff.innerHTML='<summary>本组起止状态与引用说明</summary><p><b>进入：</b>'+esc(g.startState||'尚未填写')+'</p><p><b>离开：</b>'+esc(g.endState||'尚未填写')+'</p><p>先上传以上原名文件，再复制正文。若 @ 未变成平台素材标签，请在目标平台的 @ 菜单选择同名素材；如果只显示图片编号，按上方顺序绑定。文字本身不保证自动关联。</p><p>分镜图约束构图；人物、场景、道具图各司其职，不自动当首尾帧。计划时长不是平台能力承诺。</p>';
 box.replaceChildren(binding,body,handoff,settings);$('inspectorTitle').textContent=g.id+' · '+(g.title||'生成任务');$('groupPromptHelp').textContent='整段中文 · 图名与 @ 对应 · 尚未生成视频';sizeGroupPrompt();
};
const sciOriginalBoard=renderBoard;
renderBoard=function(){sciOriginalBoard();let elapsed=0;for(const g of state.groups){const section=[...$('board').querySelectorAll('.group-section[data-group]')].find(el=>el.dataset.group===g.id),start=elapsed;elapsed+=Number(g.duration)||0;if(!section)continue;
 const head=section.querySelector('.group-heading>div'),label=document.createElement('div');label.className='chapter-label';label.innerHTML='<strong>'+esc(g.title||g.id)+'</strong><span>第 '+esc(g.segmentId||'—')+' 段 · '+start+'—'+elapsed+' 秒</span>';head.append(label);
 const strip=document.createElement('p');strip.className='chapter-state';strip.textContent=g.startState||'为本组补充起始状态';section.querySelector('.group-heading').after(strip);
 if(!assetMode(g)){const status=document.createElement('div');status.className='group-story';status.innerHTML='<span class="small muted">'+esc(groupPromptStatus(g))+'</span><button data-action="group-view" data-id="'+esc(g.id)+'">查看 / 编辑完整提示词</button>';section.append(status);}
 const index=state.groups.indexOf(g),next=state.groups[index+1];if(next){const link=sciLink(g.id,next.id),foot=document.createElement('div');foot.className='task-handoff';foot.innerHTML='<button data-action="group-view" data-id="'+esc(next.id)+'">'+esc(g.id)+' → '+esc(next.id)+' <span>'+esc(link?.type||'新连接 · 待补审')+'</span></button><p>'+esc(link?.note||'顺序已调整，请核对下一组起点，不自动沿用原剧情。')+'</p>';section.append(foot);}
 }
 const activeShots=state.order.filter(shotIsActive).length,independent=state.references.filter(r=>r.role!=='storyboard').length;
 $('projectTitle').textContent='《'+state.title+'》 · 计划 '+elapsed+' 秒 / '+state.groups.length+' 个生成任务 / '+activeShots+' 张分镜 / '+independent+' 份独立资产';
 if(state.view==='groups')$('canvasHelp').textContent='按生成任务依次阅读 · 分镜组每行最多两张 · 资产组直接描述剧情 · 组间状态在每组末尾交接';
};
const sciOriginalGate=renderGate;
renderGate=function(){sciOriginalGate();const fresh=state.groups.filter(sciFresh).length;if(fresh)$('gateStatus').textContent=fresh+' / '+state.groups.length+' 组正文对应当前资料 · '+(state.humanReviewed?'已勾选人工审看':'等待你审看')+' · 尚未生成视频';if(state.groups.some(g=>g.promptSource==='agent'&&!sciFresh(g)))$('gateStatus').textContent='资料已有变化 · 受影响组的正文待更新';};
const rehearsalReadyTimer=setInterval(()=>{
 if(!window.__boardReady)return;
 clearInterval(rehearsalReadyTimer);
 panel={type:'group',id:state.groups[0]?.id};render();
 document.title=(state.title||'电影项目')+'｜分镜预演台 · FANTASY';
 window.__rehearsalReady=true;
},70);
