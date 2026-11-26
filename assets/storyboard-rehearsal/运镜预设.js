'use strict';
/* 摄影术语参考：新南威尔士州教育部门 Camera movement、伯克利 CASN Camera Movement Terms。
   以下中文描述是工作台的导演预设，不是视频模型官方参数或效果承诺。 */
const DEFAULT_CAMERA='固定镜头';
const CAMERA_PRESETS=[
  {name:'固定镜头',category:'固定与前后移动',aliases:['固定观察'],description:'锁定摄影机位置、朝向与焦距，让人物和场景中的动作自然发生；不额外推拉、摇移或变焦。'},
  {name:'平推（向前）',category:'固定与前后移动',description:'摄影机保持高度与焦距，沿前方路径平稳靠近主体，景别逐渐收紧；是机位向前移动，不是裁切放大。'},
  {name:'缓慢推近',category:'固定与前后移动',aliases:['克制缓推'],description:'摄影机以克制、缓慢的速度靠近主体，焦距保持不变；围绕当前表演逐渐收紧构图，结束时平稳停住。'},
  {name:'后拉',category:'固定与前后移动',aliases:['后拉交代空间'],description:'摄影机沿可行路径平稳后退，焦距保持不变，逐步展开主体周围已有空间；不凭空新增景物。'},
  {name:'左移',category:'横移与跟随',description:'以摄影机起始朝向为参照，机位向左平移，保持高度、焦距与观察朝向；用真实视差呈现空间，不替换为原地向左摇镜。'},
  {name:'右移',category:'横移与跟随',description:'以摄影机起始朝向为参照，机位向右平移，保持高度、焦距与观察朝向；用真实视差呈现空间，不替换为原地向右摇镜。'},
  {name:'人物跟随',category:'横移与跟随',description:'摄影机沿人物已设定的行动路径跟随，保持合理距离和稳定景别；不反向改变人物动线，不穿越障碍物。'},
  {name:'侧向跟拍',category:'横移与跟随',aliases:['侧向跟移'],description:'摄影机位于人物侧面，与其行动方向平行移动，保持相近速度和观察距离；人物动线由剧情决定。'},
  {name:'顺时针环绕',category:'环绕',description:'以主体为中心，从场景上方俯视路径时摄影机沿顺时针方向走弧线，镜头持续朝向主体；保持合理半径，不默认完整绕行一周。'},
  {name:'逆时针环绕',category:'环绕',description:'以主体为中心，从场景上方俯视路径时摄影机沿逆时针方向走弧线，镜头持续朝向主体；保持合理半径，不默认完整绕行一周。'},
  {name:'向左摇镜',category:'摇摄与升降',description:'摄影机位置保持不变，镜头朝向从起始构图水平转向左侧，在叙事目标上停稳；不是摄影机向左平移。'},
  {name:'向右摇镜',category:'摇摄与升降',description:'摄影机位置保持不变，镜头朝向从起始构图水平转向右侧，在叙事目标上停稳；不是摄影机向右平移。'},
  {name:'向上摇镜',category:'摇摄与升降',description:'摄影机位置保持不变，镜头由下向上改变俯仰角，停在已指定的上方目标；不是摄影机整体升高。'},
  {name:'向下摇镜',category:'摇摄与升降',description:'摄影机位置保持不变，镜头由上向下改变俯仰角，停在已指定的下方目标；不是摄影机整体下降。'},
  {name:'垂直上升',category:'摇摄与升降',description:'摄影机整体平稳升高，保持原有观察朝向与焦距，让视点高度产生变化；不替换为原地仰摇。'},
  {name:'垂直下降',category:'摇摄与升降',description:'摄影机整体平稳降低，保持原有观察朝向与焦距，让视点高度产生变化；不替换为原地俯摇。'},
  {name:'希区柯克变焦',category:'变焦与手持',description:'本预设采用摄影机后退、同时增加焦距的组合，令主体在画面中的大小大致保持不变，背景透视关系随之变化；不是单纯数码放大，也不是主体或环境形变。'},
  {name:'变焦推近',category:'变焦与手持',description:'摄影机位置与朝向固定，通过增加镜头焦距收紧景别；不移动机位，不把变焦描述为透视推进。'},
  {name:'变焦拉远',category:'变焦与手持',description:'摄影机位置与朝向固定，通过减小镜头焦距展开景别；不移动机位，不把变焦描述为空间后退。'},
  {name:'手持微晃',category:'变焦与手持',description:'以当前机位附近的轻微手持呼吸感观察表演，构图仍可辨认；不额外添加剧烈抖动、突兀甩镜或漂浮感。'},
  {name:'动机性摇摄',category:'保留与自定义',description:'保留原先的动机性摇摄设定；根据人物动作或视线明确起始朝向、摇摄方向与落点，不随机扫视。'},
  {name:'升降揭示',category:'保留与自定义',description:'保留原先的升降揭示设定；在画面说明中明确上升或下降、起止高度与要揭示的对象，避免无动机升降。'},
  {name:'自定义路径',category:'保留与自定义',description:'以该镜头画面说明中的摄影机路径为准；需写明起始机位、移动方向、停止位置、焦距与速度变化，不擅自补成复杂复合运镜。'}
];
function cameraPreset(value){return CAMERA_PRESETS.find(p=>p.name===value||p.aliases?.includes(value));}
function cameraName(value){return cameraPreset(value)?.name||value||DEFAULT_CAMERA;}
function cameraDescription(value){return cameraPreset(value)?.description||'保留已有自定义运镜文字，请在镜头详情中说明路径、方向与起止状态。';}
function cameraOptions(value){
  const current=cameraName(value),categories=[...new Set(CAMERA_PRESETS.map(p=>p.category))];
  return (!cameraPreset(current)?`<option value="${esc(current)}" selected>${esc(current)}（原设定）</option>`:'')+categories.map(category=>`<optgroup label="${esc(category)}">${CAMERA_PRESETS.filter(p=>p.category===category).map(p=>`<option value="${esc(p.name)}" ${current===p.name?'selected':''}>${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
}
function cameraRequest(s){return {运镜方式:cameraName(s.camera),执行描述:cameraDescription(s.camera),执行边界:'仅作用于本镜头，不替代人物或道具运动，也不替代两镜转场。按剧情补齐主体、路径与起止构图；复杂运镜需审查素材空间是否支持。'};}
function changeShotCamera(id,value){
  const item=shot(id);if(!item||!cameraPreset(value)||cameraName(item.camera)===value)return;
  panel={type:'shot',id};record('修改 '+id+' 运镜',()=>{item.camera=value;});
  const select=[...$('board').querySelectorAll('[data-shot-camera]')].find(el=>el.dataset.shotCamera===id);select?.focus({preventScroll:true});
  toast(id+' · 运镜已设为「'+value+'」');
}
