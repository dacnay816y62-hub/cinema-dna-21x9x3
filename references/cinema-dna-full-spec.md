# CINEMA DNA Full Spec

这是保留历史经验的单帧与三联方法库，不是另一份默认工作流。与 [SKILL.md](../SKILL.md) 冲突时，以核心规则和用户当前要求为准；下文固定镜头职责、焦段与结尾形式按题材取用，不作为全部任务的强制模板。

## PATCH v3 | Triptych Narrative And Film Realism

Prime rule: do not generate "cinematic-looking pictures"; generate three frames that feel cut from the same real film sequence, with one world, clear shot functions, real camera imaging, and a readable micro-story.

Hard triptych contract:
- Shot 1 | Establish World: time, place, weather, spatial order, character/world distance, opening-shot feeling. Environment information exceeds character information.
- Shot 2 | Establish Relationship: event advances through a visible action: approaching, delivering, discovering, observing, missing, waiting, eye contact, or relation across space. Never just another angle.
- Shot 3 | Leave Aftertaste: condensed, unresolved, and suggestive. Use back view, reflection, detail, hand gesture, empty room, half-open door, read letter, left object, or departing figure.
- Ban repetition: three similar wide shots, three standing poses, three full frontal spaces, repeated composition skeletons, style-only variations, no event progression, no narrative information gap.
- Each triptych must vary at least four: shot scale, camera position, foreground treatment, information density, light concentration, composition skeleton, subject/environment ratio, emotional density.

On-site camera requirements:
- Every shot must specify at least five: focal length, camera height, camera-to-subject distance, subject frame percentage, foreground obstruction, spatial axis, light source, focus point, sightline, and where key information sits.
- Default lenses: Shot 1 uses 24-28mm, medium-deep DOF, person 5%-15%, strong spatial order. Shot 2 uses 32-50mm, person 20%-35%, layered relation. Shot 3 uses 50-85mm or a clearly changed wide observation.
- 21:9 must create horizontal relationships, left/right contrast, negative space, and off-screen extension. It cannot be a simple wide crop with empty side filler.

Film realism:
- Cinematic feel comes from staging, real space, camera position, practical light, unified color body, materials, and subtle optical imperfection.
- Default image: real narrative feature-film still, dense blacks with shadow detail, soft highlight roll-off, slight local halation, subtle real fringing, medium-low microcontrast, moderate sharpness, fine natural grain, slight edge softness, air without dirty blur.
- Optical flaws must be local and restrained: high-contrast edges, highlights, lamp glass, window frames, architecture edges, silhouettes, wet reflections, metal edges. No cyber RGB split.

Composition:
- Each triptych must include at least three: meaningful foreground obstruction; door/glass/columns/rail/curtain/furniture/crowd/window framing; subject as part of space; key information in background; offset or controlled imbalance; meaningful negative space.
- Use Strong Order Composition for ritual, power, corridors, palaces, train cars, offices, hotels, and Wes-like precision: axis, one-point perspective, geometry, order pressing on people, with one meaningful break.
- Use Controlled Imbalance Composition for youth, memory, Venice, grassland, observation, transition, and Eastern spatial poetics: offset, foreground intrusion, imperfect perspective, in-progress feeling.

Bright-subject anti-drift:
- Blue sky, grass, youth, campus, sun, clean red/white buildings, and positive subjects must stay live-action film stills, not animation, manga, sweet commercial, school promo, idol poster, travel ad, or real-estate brochure.
- Keep real sky/clouds, irregular grass, used architecture, event-driven human action, restrained red accents, soft highlights, real exposure, and light grain.

Director patches:
- Wes-like direction is not purple plus symmetry. It requires strong central order, calm faces, theatrical space, prop narration, unified palette, precise but not dead composition, people placed inside a geometric stage.
- King Hu / Eastern wuxia is not game poster, costume-drama beauty still, or xianxia. It requires emptiness, moisture, landscape and architecture co-narration, curtains/doors/corridors/bridges/water/bamboo layers, small but present figures, low-saturation red or dark-clothing accent, more stillness than action, looking/being looked at, separation and threshold tension.
- Ancient, ruin, mythic, coast, mountain, desert, and other scenic subjects must not become beautiful location photography. Add an explicit second narrative force early: watcher, pursuer, child, smoke signal, empty seat, abandoned tool, blocked doorway, unlit hearth, changed object, or trace of absence. Place the camera in a constrained practical position and make the landscape or ruin act as a social, ritual, or moral machine rather than scenery.

Hidden plot check:
- Before generation, answer internally: what second-to-second story is covered, why the character is here, what happened before Shot 1, what may happen after Shot 3, what information changes, and what unresolved hook remains.
- Output check: three shots truly different, clear shot functions, small story, Shot 3 has residue, camera has position, FG/MG/BG are meaningful, no poster/ad/comic/CG/game/promo/filter-only cinema, bright subjects avoid sugar, Eastern subjects avoid xianxia, Wes-like subjects avoid color-only symmetry.

This reference preserves the original v2 source instructions. Read it when the task needs detailed director DNA selection, reference-image rules, examples, or deeper quality checks beyond the core workflow in SKILL.md.

# CINEMA DNA｜21:9 × 3 叙事电影镜头生成系统

## 1. Skill 目标

将用户提供的主题、故事、人物、空间、产品、建筑或原始图片，转换为：

- **单张 21:9 电影镜头**
或
- **3 张连续的 21:9 叙事电影镜头**

重点不是做“像某位导演”的滤镜图，而是生成：

- 有明确叙事瞬间的画面
- 有镜头语言与场面调度的画面
- 有空间关系与人物位置意识的画面
- 有电影胶片摄影机气质的画面
- 有连续情绪推进与余韵的画面

最终目标始终是：

> **像一段电影正片中的镜头，而不是一张有电影滤镜的图片。**

---

# 2. 核心升级：默认优先输出“三联叙事模式”

本 Skill 默认优先采用：

# **Triptych Narrative Mode｜三联叙事模式**

即输出 3 张独立画面，每张均为 **21:9 超宽银幕比例**，三张图共同组成一段短小但完整的电影片段感。

这 3 张图不是三张风格相近但彼此无关的图片，而必须遵守：

> **同一世界、同一人物、同一事件、同一时间段、同一胶片系统、同一情绪线索。**

### 默认用途
适合：
- 社媒拼接发布
- 电影感内容展示
- 导演感表达
- 场景叙事
- 空间摄影转电影化
- 产品与建筑的故事化表现
- 人物与空间关系表达
- “一小段电影”式视觉输出

### 如果用户未明确说明输出数量
默认：
- **优先输出 3 张 21:9 三联叙事镜头**
- 若用户只需要一张，再切换为单帧模式

---

# 3. 两种输出模式

## 模式 A｜Single Frame Mode
输出 1 张 21:9 独立电影镜头。

适用于：
- 用户只需要一张图
- 用户只测试视觉方向
- 作为后续三联模式的风格锚点

---

## 模式 B｜Triptych Narrative Mode（默认推荐）
输出 3 张连续的 21:9 电影镜头。

适用于：
- 需要更强故事感
- 需要更强传播性
- 需要“像电影片段”
- 需要人物、空间与氛围递进
- 需要电影拼接展示

---

# 4. 三联叙事输出规则｜Triptych Narrative Mode

## 4.1 基本原则

三联输出必须遵守：

- 三张图来自**同一段叙事片段**
- 三张图来自**同一个世界观**
- 三张图拥有**统一的胶片质感**
- 三张图拥有**统一的光线逻辑**
- 三张图拥有**统一的色彩母体**
- 三张图拥有**统一的人物与服装**
- 三张图拥有**统一的时间与天气**

同时又必须产生：

- 景别变化
- 构图变化
- 情绪变化
- 关注点变化
- 空间推进
- 镜头递进

---

## 4.1.1 正确出图与拼接工作流

生成三联镜头时，不要让图像模型直接画“三联拼贴”“分镜板”“contact sheet”或“海报版式”。正确工作流是：

1. 先生成一张人物与场景母版（如用户已提供参考图，则以参考图作为母版）。
2. 锁定人物身份、五官、服装、场景、主色母体、辅助色、光线系统和材质语言。
3. 分别生成 Shot 1、Shot 2、Shot 3，每张都是独立 2.39:1 真实电影剧照。
4. 每张图内部不加文字、不加白边、不生成黑边、不做拼贴。
5. 每张图外部后期统一裁切到 2.39:1。
6. 最后在外部竖向拼接成一张成品。

拼接规则：
- 三张比例统一为 2.39:1。
- 中间不加文字。
- 图片之间可使用 0–10px 黑色间隔；默认无间隔。
- 不加白色边框。
- 不在图片内部生成黑边。
- 最终黑边、间隔或外框只允许在后期拼接阶段添加。

---

## 4.2 三联结构

### Shot 1｜建立镜头
负责建立：
- 时间
- 地点
- 空间
- 世界观
- 人物所处位置
- 基础氛围

优先使用：
- 远景
- 大全景
- 建筑主导型构图
- 环境中的小人物
- 大空间、小人物关系
- 开场式构图

重点：
- 先让观众“进入这个世界”
- 人物可以小，但必须清楚存在
- 画面应有明显的开场感、进入感、观察感

---

### Shot 2｜关系镜头
负责推进：
- 人物与空间的关系
- 人物与人物的关系
- 人物与事件的关系
- 情绪开始收紧

优先使用：
- 中景 / 中远景
- 通道
- 门洞
- 柱列
- 长廊
- 窗框
- 框中框
- 明确的中间事件

重点：
- 让故事真正开始“动起来”
- 画面关注点必须更集中
- 构图与光线开始收紧

---

### Shot 3｜余韵镜头
负责留下：
- 情绪落点
- 记忆点
- 停顿感
- 悬念
- 余味

优先使用：
- 中近景
- 特写
- 背影
- 回头
- 空空间
- 遗留痕迹
- 孤独停顿
- 细节物件

重点：
- 不一定解释清楚
- 不追求“讲完”
- 追求留下更准、更凝练的情绪终点

---

## 4.3 三联统一原则

三张图必须统一：
- 人物身份
- 服装造型
- 场景世界观
- 时间段
- 天气状态
- 光线系统
- 色彩母体
- 胶片机质感
- 叙事事件

---

## 4.4 三联变化原则

三张图必须变化：
- 景别变化
- 机位变化
- 构图骨架变化
- 情绪密度变化
- 视觉主次变化
- 主体与空间距离变化

禁止：
- 三张图只是同一张图不同裁切
- 三张图只是同一人物不同站姿
- 三张图只是类似海报的平行换景
- 三张图毫无叙事关系

---

# 5. 常用三联叙事模板

## 5.1 进入式
适合：
- 刚到某地
- 走进某空间
- 进入某世界
- 探索开始

结构：
1. 外部 / 整体建立
2. 人物进入或接近
3. 内部停顿或观察

---

## 5.2 对峙式
适合：
- 人物对峙
- 权力关系
- 危险前兆
- 紧张人物关系

结构：
1. 空间建立
2. 关系形成
3. 紧张落点

---

## 5.3 漫游式
适合：
- 城市
- 酒店
- 武侠空间
- 科幻空间
- 未知建筑

结构：
1. 世界
2. 穿行
3. 停顿 / 回望

---

## 5.4 发现式
适合：
- 悬疑
- 神秘空间
- 科幻发现
- 建筑 / 产品叙事
- 遇见某个目标

结构：
1. 接近未知
2. 发现目标
3. 情绪余韵

---

## 5.5 孤独式
适合：
- 都市人物
- 文艺情绪
- 回忆
- 疏离感
- 王家卫 / 安东尼奥尼 / 塔可夫斯基方向

结构：
1. 人物被世界包围
2. 人物与空间轻微互动
3. 留下更空、更静的结尾

---

## 5.6 仪式式
适合：
- 宗教空间
- 队列空间
- 古典建筑
- 典礼
- 权力场景

结构：
1. 空间权力建立
2. 人物进入秩序
3. 个体被结构吞没或突出

---

# 6. 默认视觉方向（可按当前任务调整）

## 6.1 胶片电影机质感
默认优先采用：

- 轻微胶片颗粒
- 克制的高光过渡，只有在真实强光边缘才允许轻微 halation
- 真实暗部空气感
- 黑位略深但不死黑
- 有轻微旧镜头成像气质
- 色彩克制，不数码塑料
- 光影像“拍出来”的，而不是“渲染出来”的
- 表面偏哑光、粗粝、干燥、磨损，有真实材质阻尼
- 不过度锐化
- 不 HDR
- 不过度高饱和
- 不假性胶片脏污效果
- 不过度黄化复古
- 不油亮、不塑料、不像游戏引擎渲染
- 不全局泛光、不大片镜面高光、不让皮肤或石材出现蜡质反光

---

## 6.1.1 反油腻 / 反游戏感规则

当题材涉及史诗、古代、科幻、幻想或巨大建筑时，模型很容易滑向游戏概念图。此时必须主动压低“视觉奇观词”，改用实拍质感词。

优先写：
- 实拍电影剧照
- 真实外景或实景搭建
- 自然曝光
- 可见光源
- 哑光石材
- 氧化金属
- 粗麻布、旧皮革、磨损木材
- 灰尘、烟、风、汗、泥、划痕、脚印
- 人物疲惫、克制、处于动作过程
- 服装有重量和脏污，不像游戏皮肤

避免写：
- epic、ultra detailed、masterpiece、hyperreal、8k、volumetric fantasy
- 英雄站姿、宣传海报感、boss scene
- 发光轮廓、魔法边缘光、无来源蓝橙双光
- glossy、polished、sleek、shiny、perfect surface
- Unreal Engine look、CGI render、game cinematic、concept art、digital painting

负面提示追加：
- no CGI render
- no Unreal Engine look
- no game cinematic
- no concept art
- no fantasy illustration
- no digital painting
- no glossy specular highlights
- no oily skin
- no waxy faces
- no plastic armor
- no lacquered stone
- no over-clean costumes
- no heroic poster pose
- no impossible rim light

---

## 6.1.2 构图哲学 / 拒绝无意义前景

前景不是“电影感装饰”。前景必须通过空间、叙事、视线或心理关系获得存在理由。不要为了显得电影而随手加入模糊栏杆、帽檐、肩膀、树叶、玻璃、烛台、家具边缘或局部身体。

添加前景、遮挡、失焦或局部特写前，必须至少满足一个功能：
- 解释摄影机真实站位
- 形成框中框，并把视线导向情绪焦点
- 清楚地区分前景 / 中景 / 远景空间层次
- 延迟信息，制造叙事悬念
- 表达人物被困、被看见、被排除、被隔离或无法进入的状态
- 与建筑轴线、光斑、水平线、身体线条或阴影形状形成有意义的图形关系

必须拒绝：
- 随机大面积虚化物体遮住画面
- 没有叙事理由的帽檐、肩膀、玻璃、栏杆、树叶、武器、烛台、家具近景
- 用微距细节替代场景调度
- 用浅景深掩盖构图不足
- 前景抢夺主体注意力但不增加空间、危险、隐私、距离或意义

电影构图应先建立：
- 视觉轴线：走廊、运河线、道路、桌沿、柱列、窗带、楼梯、墙缝、海岸线、天际线或阴影带
- 人物调度：进入、迟疑、等待、穿越、倚靠、转身、被注视、被遮挡，而不是摆拍
- 体块与留白：先平衡暗部体块、亮部体块、人物尺度和空间空洞，再加纹理
- 观看路径：前景线索 -> 人物 / 事件 -> 背景后果
- 留白压力：留白必须产生孤独、压迫、等待、秩序或未知，而不是空
- 对称理由：对称只用于秩序、仪式、权力或不安；当故事需要失衡时必须打破对称
- 三联递进：Shot 1 观察世界，Shot 2 见证关系，Shot 3 留下情绪残留

局部特写也必须保留故事位置。手、帽子、脸、工具、图纸、车门、灯具、窗框等局部，必须能让观众知道它属于哪个空间、哪件事、哪种心理后果。

当画面“漂亮但不电影”时：
- 减少风景完整性和明信片式平衡
- 增加一个未解决的人物动作或决策痕迹
- 让摄影机站在受限制的真实位置：门边、桌端、站台角落、楼梯平台、服务走廊、窗洞、车内、检修坑
- 使用一个不完美的建筑或环境中断，但不能变成装饰
- 保留视觉轴线，但打破观赏性对称
- 美感应来自调度和光线几何，不来自风景奇观

---

## 6.1.3 复古胶片 / 反油腻校准

当画面出现油腻、过度顺滑、过度琥珀、过度金黄、过度 CG 干净或游戏感时，必须先执行这组校准再重写 prompt。

核心调整：
- 把“warm golden cinematic light”改成“aged tungsten practical light, amber but dirty and low-output”
- 暖色只允许在灯具、窗边、火光或局部反光中出现，不允许铺满全图成为蜂蜜金色或漆面金色
- 胶片颗粒主要集中在阴影和中间调，细到中等、自然不均匀，避免统一颗粒贴纸
- 加入旧发行拷贝质感：轻微 gate softness、不完美乳剂、轻微色密度变化、哑光黑位、压低的暖高光
- 降低肤色、布料、抛光木头、黄铜、水面反光的饱和与光泽
- 皮肤必须自然、略暗、有纹理，不能蜡质、油亮或商业美容补光
- 布料必须吸光：羊毛、毡帽、亚麻、帆布、旧外套应干燥、有纤维、无镜面反射
- 石材、灰泥、木材、金属必须有时间痕迹：污垢、氧化、划痕、剥落油漆、盐渍、烟熏、水痕
- 如果灯具或窗口像柔光美容滤镜，立刻把 bloom / halation 减半
- 对比来自真实阴影和实景光源，不来自 HDR、油亮边缘或渲染器高光
- 优先写“1970s/1990s cinema print density”或“aged release-print grain”，不要写“vintage filter”

威尼斯 / 老宫殿 / 黑色电影室内方向：
- 使用 olive-umber shadows、aged plaster、oxidized brass、dirty tungsten lamps、canal humidity、smoke-darkened corners
- 避免 clean gold walls、shiny hotel-lobby polish、waxy faces、spotless suits、overly smooth water、decorative fantasy luxury
- 图像应像旧剧情长片拷贝：浓密、有触感、略旧、光学上不完美

反向限制：
- no CGI render
- no Unreal Engine look
- no game cinematic
- no glossy specular highlights
- no oily skin
- no waxy faces
- no clean gold luxury
- no global amber wash
- no heavy grain overlay
- no vintage filter
- no RGB split

---

## 6.1.4 Optical Imperfection System｜光学缺陷系统

目标：让画面更接近真实电影摄影机与镜头成像，而不是无瑕疵 CG 图。要的是 subtle optical imperfection，不是 stylized chromatic effect。

默认成像基线：
- 画幅：2.39:1 超宽银幕。
- 成像：真实剧情长片剧照，35mm 电影胶片质感。
- 黑位：浓密、偏深，但保留暗部层次。
- 高光：柔和滚降，局部实景灯具轻微晕染。
- 锐度：中低微反差，主体清晰但不数码锐利。
- 颗粒：细小、不均匀、自然，禁止颗粒贴纸感。
- 色彩：一个主色母体 + 一个辅助色 + 极少量点缀色。
- 曝光：整体轻微欠曝约 0.5-1 档。
- 光线：只使用可解释的实景光源。
- 肤色：自然、略暗，不做商业美容补光。
- 景深：建立镜头使用中深景深。

### 色差 / 色散规则

只允许轻微光学色差，只在高反差边缘出现：
- 窗框边缘
- 建筑边缘
- 人物轮廓边缘
- 逆光树枝或逆光物体边缘
- 灯具与黑暗交界处
- 金属反光边缘
- 玻璃高反差边缘

可表现为极轻微青 / 红、蓝 / 橙、绿 / 品红偏移，但必须非常轻。禁止：
- 全图 RGB 错位
- 明显红蓝双边
- vaporwave / 赛博滤镜感
- 全画面到处彩边
- 影响主体识别与清晰度
- 一眼看出“加了色散特效”

提示写法必须限定：
- subtle chromatic fringing on bright high-contrast edges
- subtle edge chromatic fringing only on window frames, architecture edges, silhouettes, metal reflections
- controlled edge fringing, not digital RGB split

不要裸用：
- chromatic aberration
- RGB split
- strong aberration

### Halation｜高光晕染规则

Halation 只在高亮区域轻微出现，优先出现在：
- 钨丝灯
- 烛光
- 窗口高光
- 火焰
- 实景灯具
- 反光高点

效果必须像胶片乳剂轻轻吃开高光边缘：柔和、克制、局部、真实。禁止：
- 大面积发白
- 柔光滤镜感
- 商业磨皮光
- 无来源泛光
- 把暗部洗灰

推荐写法：
- soft film halation around practical lights and bright highlights
- soft highlight roll-off
- slight optical bloom in bright practical areas

### Bloom / Veiling｜轻微泛光与空气雾化

只在光线、镜头和空气共同成立时使用：
- 强窗光穿过灰尘
- 火光 / 钨丝灯在暗场里
- 雾、烟、沙、尘、湿地反射
- 夜景灯具与玻璃、湿地面交界

它不是磨皮柔光。要保留对比、空间和材质。

### Anamorphic Imperfection｜宽银幕镜头缺陷

允许：
- 边缘轻微软化
- 画面边缘轻微拉伸感
- 高反差边缘轻微色偏
- 亮点不完全干净
- 微弱暗角
- 真实镜头空气感

禁止：
- 主体糊掉
- 低画质截图感
- 牺牲空间细节
- 蓝色横向 anamorphic flare 模板化

### 三种光学子配方

#### A｜Oppenheimer Optical Look

适合：真实历史感、人物 + 自然光、大空间、烟尘、火光、实验室、会议室、户外、稳重电影感。

配方：
- 色散强度：约 5%
- halation：中等偏低
- 高光柔化：中等
- 边缘软化：低
- 颗粒：细小
- 对比：中高
- 微反差：中低

提示语：
- subtle chromatic fringing on bright high-contrast edges
- soft film halation around practical lights and bright highlights
- dense blacks, natural skin, soft highlight roll-off
- subtle 70mm film optics, slight lens imperfection

#### B｜Brutalist Optical Look

适合：建筑、室内空间、柱列、混凝土、大厅、权力感、现代主义冷感。

配方：
- 色散强度：4-6%
- halation：低
- 边缘软化：中低
- 冷暖边缘偏色：有
- 颗粒：细小偏克制
- 对比：中高
- 锐度：中低

提示语：
- subtle chromatic aberration along architectural edges
- restrained lens fringing on backlit concrete and glass
- slightly softened edge rendering, realistic filmic optics
- cool shadow tones with warm practical highlights

#### C｜Blade Runner 2049 Optical Look

适合：科幻、雾、沙、尘、城市、夜景、巨构、空旷空间、未来感。

配方：
- 色散强度：6-10%
- halation：中
- bloom：中
- 空气散射：高
- 边缘软化：中低
- 颗粒：细小
- 对比：中
- 饱和：中低，但综合色偏强

提示语：
- subtle atmospheric chromatic separation
- mild anamorphic lens aberration
- slight color fringing in haze, reflections, and high-contrast edges
- soft optical bloom, dense cinematic atmosphere
- controlled edge fringing, not digital RGB split

### 高风险词禁用

这些词容易把画面带向特效化、滤镜化、赛博化、数码化或低级电影感模板：
- chromatic aberration（单独裸用）
- RGB split
- heavy film grain
- vintage filter
- retro washed out
- cinematic color grading
- moody film still
- anamorphic flare
- hyper realistic
- ultra detailed
- razor sharp
- dramatic neon
- strong aberration

---

## 6.2 构图默认偏好
优先使用：

- 中轴秩序
- 框中框
- 长廊
- 柱列
- 门洞
- 窗框
- 前景遮挡
- 结构性很强的空间切割
- 大空间中的小人物
- 人物被建筑与光线包围
- 留白与压迫共存

---

## 6.3 默认色彩偏好
优先色系：

- 烟蓝灰
- 冷灰
- 琥珀金
- 深褐
- 暗绿
- 雾橙
- 低饱和暗红
- 黑金属
- 水泥灰
- 旧木色

色彩应呈现：
- 低饱和但有层次
- 中低对比但有重点
- 情绪明确但不过火
- 有空气与时间感

---

# 7. 默认输出标准

除非用户另有说明，始终遵循：

- 单张或三张独立画面
- 每张均为 21:9 超宽银幕比例
- 无文字
- 无标题
- 无字幕
- 无水印
- 非拼贴海报
- 非影视海报
- 非分镜板排版
- 非廉价“电影滤镜”
- 非游戏概念设定图
- 非商业广告棚拍感
- 必须有明确叙事瞬间
- 光线必须有合理来源
- 材质真实、可触摸
- 人物、空间与环境必须互相解释

---

# 8. 输入识别

用户可能提供：

1. 一句话主题  
2. 一个简单故事  
3. 人物 / 人物关系  
4. 建筑 / 空间 / 室内  
5. 产品或家具  
6. 一张待转换的原始图  
7. 一组电影截图参考  
8. 指定导演 / 电影 / 摄影风格  
9. 指定情绪 / 地点 / 时间 / 天气  
10. 只说“自由发挥”

无论输入多少，都先提取：

- 主体是谁或是什么
- 场景发生在哪里
- 当前正在发生什么
- 上一秒发生了什么
- 下一秒可能发生什么
- 画面的主要情绪
- 最适合的叙事模板
- 最适合的视觉主引擎
- 需要的辅助引擎
- 是否适合三联模式
- 人物与空间的尺度关系
- 镜头距离与机位
- 光源与时间
- 主色与辅助色
- 是否需要保护原图结构、人物或产品

---

# 9. 八个电影视觉主引擎

每次生成先选择：
- 1 个主引擎
- 1–2 个辅助引擎

---

## 9.1 秩序构图
用于画面高级感主要来自人物、建筑和物体安排的题材。

可调用：
- 中轴对称
- 中心透视
- 正面静态机位
- 横向阵列
- 多人物分层
- 前景遮挡
- 框中框
- 门窗分割
- 建筑几何切割
- 镜像关系
- 多景深视线关系

原则：
- 不是为了对称而对称
- 每个人物位置都必须有叙事目的
- 前、中、远景必须产生关系

---

## 9.2 光影戏剧
用于张力主要来自光源和阴影的题材。

可调用：
- 硬质窗光
- 门缝光
- 顶光
- 逆光剪影
- 火光
- 烛光
- 深度欠曝
- 冷暖双光源
- 体积光
- 局部高光
- 大面积黑暗包围小范围亮部

原则：
- 光线必须有真实来源
- 亮部只照亮叙事重点
- 不平均照亮整个空间

---

## 9.3 色彩叙事
用于颜色承担人物关系与情绪的题材。

可选结构：
- 单色统治
- 冷暖冲突
- 色块分区
- 褪色记忆
- 高饱和情绪（谨慎）

原则：
- 主色不超过 2–3 种
- 色彩必须服务叙事
- 不把导演风格简化成某几种颜色

---

## 9.4 空间叙事
用于建筑、室内、环境本身承担故事的题材。

常用空间：
- 空房间
- 酒店
- 走廊
- 餐厅
- 车站
- 办公室
- 教堂
- 地下空间
- 工厂
- 海边平台
- 山门
- 客栈
- 太空舱
- 荒地
- 大厅
- 电梯间

空间中至少加入一种叙事痕迹：
- 没喝完的水
- 被拉开的椅子
- 半开的门
- 凌乱床铺
- 风吹起的帘幕
- 地面积水
- 还亮着的一盏灯
- 遗留衣物
- 远处离开的人

---

## 9.5 人物状态
根据人物心理与行为组织画面。

可选状态：
- 凝视
- 等待
- 对峙
- 孤独
- 漫游
- 失控
- 仪式
- 错过
- 隐藏
- 观察

原则：
- 避免普通站姿
- 避免模特摆拍感
- 动作应处于过程中
- 表情克制

---

## 9.6 尺度与世界
适用于史诗、科幻、巨构、自然与灾难。

子类型：
- 人与巨构
- 人与自然
- 人与宇宙
- 人与神话
- 人与文明

原则：
- 大场景中必须保留人物命运
- 巨大不等于堆满细节
- 优先极简、沉默、真实的尺度

---

## 9.7 东方场面
适用于东方武侠、历史空间、古代叙事。

核心结构：
- 山水藏人
- 建筑布阵
- 静极生动
- 风动人静
- 远观动作
- 长卷空间

原则：
- 山水不是背景，而是叙事空间
- 人物位置比服装更重要
- 利用门窗、廊道、竹林、帷幕、雾气构成动作空间

---

## 9.8 主观与实验镜头
用于不安、梦境、记忆断裂、偷窥感与先锋作者气质。

可调用：
- 鱼眼
- 超近特写
- 低机位仰拍
- 倾斜地平线
- 镜面反射
- 玻璃折射
- 水下视角
- 门镜视角
- 监控视角
- 运动模糊
- 焦点漂移
- 极端裁切
- 负空间
- 不完整人物

原则：
- 每一种变形必须服务情绪
- 一张图最多使用 1–2 种实验手法
- 不可破坏人物身份与空间逻辑

---

# 10. 导演与电影 DNA 库

导演或电影只作为内部配方，不应仅仅写“某某导演风格”。  
必须转译为具体电影语言。

---

## 10.1 精密荒诞 DNA
主要参考韦斯·安德森式视觉语言。

提取：
- 正面静态机位
- 严格但不过分机械的对称
- 平面化景深
- 精确道具排列
- 冷静人物表情
- 舞台化空间
- 复古色块
- 群像站位
- 荒诞但严肃的瞬间

---

## 10.2 现实史诗 DNA
主要参考诺兰式视觉语言。

提取：
- 巨大真实空间
- 渺小人物
- 深透视
- 自然光
- 真实物理材质
- 风、海浪、尘埃、烟雾
- 冷暖冲突
- 时间、命运、未知
- 实景感而非概念图感

---

## 10.3 沉默巨构 DNA
主要参考维伦纽瓦式视觉语言。

提取：
- 极简巨大空间
- 粗粝建筑
- 小人物剪影
- 沙尘、浓雾、颗粒空气
- 仪式队列
- 压迫几何
- 焦褐、灰白、暗红
- 神秘但不解释

---

## 10.4 东方武侠 DNA
主要参考胡金铨式场面调度。

提取：
- 山水与建筑共同叙事
- 门窗、廊道、竹林、帷幕形成层次
- 人物隐藏于空间
- 大量留白
- 动作前的静止
- 风吹衣摆与竹叶
- 横向长卷感

---

## 10.5 密色情绪 DNA
主要参考王家卫及东亚都市情绪电影。

提取：
- 深红、暗绿、烟黄、夜蓝
- 狭窄室内
- 门框、玻璃、镜面、帘幕遮挡
- 靠近但疏离的人物
- 潮湿、夜色、反射
- 错过、等待、欲望、记忆

---

## 10.6 几何未知 DNA
主要参考库布里克式视觉结构。

提取：
- 极端对称
- 中心透视
- 冷静空间
- 长走廊
- 秩序中的不安
- 仪式化动作
- 建筑与人物冲突

---

## 10.7 时间废墟 DNA
主要参考塔可夫斯基式时间与遗迹感。

提取：
- 水迹
- 废墟
- 旧工业空间
- 风雨雾
- 缓慢时间
- 人物漫游
- 自然侵入建筑
- 记忆与现实叠压

---

## 10.8 远观东方 DNA
主要参考侯孝贤、李安、黑泽明等东方远景叙事。

提取：
- 远观人物
- 自然遮挡
- 风雨尘土
- 动作在空间中发生
- 真实地形
- 克制服装
- 历史环境中的人

---

## 10.9 冷灰未来 DNA
可用于现代都市、科幻、办公室与高层空间。

提取：
- 冷灰蓝色空气
- 大面积玻璃
- 极简现代空间
- 城市天际线
- 冰冷秩序
- 高层孤独
- 人物在结构中极小或被背光

---

# 10.10 导演 DNA 强度控制

当用户指出“导演风格化弱”时，不要简单增加导演名字或风格形容词，必须从摄影机行为、场面调度、节奏、光线系统和道德视角上增强 DNA。

每组导演 DNA 必须先定义：
- 摄影机伦理：远观者、正面见证者、受限参与者、监控式观察、仪式化对称、手持不确定、压缩距离的窥视
- 调度习惯：轴线秩序、横向调度、人物被建筑吞没、画外事件施压、人物背向摄影机、阈限分隔、动作藏在背景
- 节奏：行动前静止、程序化等待、突然缺席、延迟揭示、未解决停顿、几何重复
- 光线逻辑：三张图共享一种可解释的实景光源模式
- 色彩纪律：一个综合色母体承担情绪论点，只允许一个小面积反色
- 标志性光学缺陷：边缘软化、局部 halation、烟尘密度、深负空间、遮挡面部、克制颗粒

导演 DNA 必须在三张图中连续可见：
- Shot 1 呈现这个 DNA 的世界秩序
- Shot 2 呈现人物如何被这个秩序困住、审判或推动
- Shot 3 留下这个 DNA 的情绪残影

如果结果看起来泛泛，不要加形容词，应该加强一个具体调度规则。

---

# 10.10.1 参考图学习：室内 / 社会调度语法

当用户提供华丽室内、餐桌、窗光、台灯、火光、车厢、宫殿、餐厅、群像或权力关系参考图时，只提取抽象电影语法，不复制具体人物、服装、场景或经典镜头。

核心构图：
- 画面应从社会关系出发，而不是从单一主体摆拍出发
- 场景允许时使用 3-7 个叙事节点：主角、对手、观察者、侍者、守卫、空椅子、倒下的人、出口、灯、窗、桌子、决策物件
- 每个节点必须有角色：观察者、目标、见证者、阻挡者、受害者、权威、出口或后果
- 家具、灯、窗、门、画、镜子、钟、楼梯、地面纹样必须成为权力几何，而不是装饰
- 用视线、桌沿、地面线、窗带、椅背和灯列把观众从前因带到动作，再带到后果

室内调度家族：
- 华丽权力群像：高位或广角，密集房间，多名见证者，一个政治、暴力或权力中心，由吊灯、桌子、地面、门和身体组织等级
- 餐桌谈判电影：人物被桌子、灯、餐食、窗或空椅分隔；动作很小但决定性强
- 窗光剪影室内剧：苍白窗框和黑暗身体制造道德距离；窗帘、椅子、桌腿组织冲突
- 饱和社会密度：拥挤室内，局部红 / 绿 / 金，面孔和服装围绕一个被困或被审视的主体形成社会网络
- 受限见证者视角：摄影机站在铁艺、玻璃、门边、椅背、桌端、车厢座位、服务走廊或窗洞之后；遮挡必须让观众成为见证者，而不是装饰

色彩和光线：
- 暖色必须局部存在：台灯、吊灯、壁炉、彩窗、桌灯或窗口，不允许全图琥珀
- 可用室内配色：烟草褐 + 暗绿 + 脏钨丝灯；酒红软包 + 烟黑 + 苍白窗青；象牙日光 + 深木色 + 哑金；翡翠点缀 + 黑漆阴影 + 红灯；冷灰日光 + 棕木 + 小火光
- 肤色由实景光和阴影塑造，不做美容补光
- 布料应吸光或散光：天鹅绒、羊毛、丝绸、蕾丝、棉、织锦；避免蜡脸和亮面戏服
- 烟、尘、湿气和雾化必须由可见光源和房间空气解释

镜头：
- 24-28mm：房间作为制度，人物是秩序里的棋子
- 32-50mm：谈话、谈判、进餐、审问、角色冲突
- 50-85mm：穿过框架压缩关系、局部脸、倒影、后果
- 禁止用抹掉社会几何的特写替代场面调度

---

# 10.11 线性故事脊柱

三联镜头不能只是三张漂亮且相关的剧照，必须有可见的因果线：原因、动作、后果。

生成前必须内部写出一条故事脊柱：
- Shot 1：因为某件事已经发生，人物进入或面对某个具体空间
- Shot 2：人物执行或拒绝一个具体动作
- Shot 3：空间留下后果、缺席或未解决的决定

每张图必须有故事动词，而不只是氛围：
- 到达、等待、穿越、隐藏、打开、研究、拒绝、修理、倾听、发现、放弃、跟随、返回、失去、移除、烧毁、锁上、离开

连续物件必须移动或变化：
- 信封、图纸、灯、车门、外套、工具、车票、地图、椅子、窗、门、火、火车、公交车、信号打印纸、戏服、水痕

线性构图必须服务故事：
- 使用一条主导线，把观众从前因带到当前动作，再带到后果
- 避免只有纵深、没有决策方向的构图
- 如果画面没有可见因果关系，必须先重写再生成

---

# 11. 自动判断逻辑

当用户没有指定风格时，按以下顺序判断。

## 第一步：判断更适合单帧还是三联
如果题材存在：
- 空间进入感
- 人物行进
- 情绪推进
- 关系变化
- 发现过程
- 建筑穿行
- 都市漫游
- 武侠等待
- 科幻探索

优先三联模式。

如果题材只是：
- 单一肖像
- 单一产品重点展示
- 单一建筑角度测试
- 简单氛围尝试

可用单帧模式。

---

## 第二步：判断最重要的画面力量
询问自身：
- 构图最重要？
- 光线最重要？
- 色彩最重要？
- 空间最重要？
- 人物心理最重要？
- 尺度最重要？
- 东方动作最重要？
- 主观镜头最重要？

选择 1 个主引擎。

---

## 第三步：选择辅助引擎
通常选 1–2 个：
- 构图 + 人物状态
- 光影 + 色彩
- 空间 + 人物状态
- 尺度 + 光影
- 东方场面 + 空间
- 色彩 + 主观镜头
- 构图 + 空间
- 人物状态 + 主观镜头

不要堆叠超过 3 个引擎。

---

## 第四步：选择叙事模板
从以下中选：
- 进入式
- 对峙式
- 漫游式
- 发现式
- 孤独式
- 仪式式

---

## 第五步：选择导演 DNA
最多选择 2–3 组。

推荐比例：
- 主 DNA：50%–70%
- 辅助 DNA：20%–35%
- 点缀 DNA：10%–20%

---

## 第六步：确定镜头
为每张图选择：
- 景别
- 焦段
- 机位
- 运动状态
- 前景遮挡
- 焦点位置
- 画面轴线

---

## 第七步：确定光线
明确：
- 时间
- 天气
- 光源
- 光线方向
- 硬度
- 色温
- 曝光关系

---

## 第八步：确定色彩
明确：
- 主色
- 辅助色
- 点缀色
- 饱和度
- 黑位
- 高光状态

---

## 第九步：确定叙事瞬间
必须回答：
- 这一秒之前发生了什么？
- 下一秒会发生什么？
- 人物为什么在这里？
- 冲突是什么？
- 第三张图留下的余味是什么？

---

# 12. 镜头选择规则

## 18–24mm
用于：
- 巨构
- 建筑
- 史诗
- 极端空间关系

注意：
- 避免过度畸变
- 不拉长人物

---

## 28–35mm
默认电影焦段，适合：
- 空间叙事
- 人物与环境
- 酒店
- 街道
- 房间
- 山林
- 群像

---

## 40–50mm
用于：
- 对话
- 室内
- 等待
- 人物心理
- 双人关系
- 更自然克制的叙事

---

## 65–85mm
用于：
- 远观关系
- 压缩空间
- 仪式
- 人群中的人物
- 隔着玻璃 / 门框拍摄
- 武侠远观
- 孤独切离

---

## 100mm 以上
只在需要强烈压缩与距离感时使用。

---

# 13. 构图与场面调度规则

每张画面至少包含以下三层中的两层：
- 前景
- 中景
- 远景

优先元素：
- 门框
- 玻璃
- 柱子
- 走廊
- 家具
- 水面
- 烟雾
- 帘幕
- 栏杆
- 树枝
- 影子
- 其他人物局部

允许：
- 人物偏边
- 人物背对镜头
- 主体被部分遮挡
- 大面积留白
- 黑暗吞没空间
- 重要信息在远景发生

避免：
- 所有人物正面看镜头
- 像广告摆拍
- 没有前后景关系
- 没有视线方向
- 所有区域曝光一致

---

# 14. 光线规则

光线必须回答“从哪里来”。

可用光源：
- 日光
- 阴天散射光
- 日落
- 月光
- 火焰
- 烛光
- 灯具
- 车灯
- 招牌
- 走廊灯
- 舷窗
- 工业照明
- 窗口反射光

禁止：
- 无来源轮廓光
- 无理由蓝橙双光
- 暗部完全死黑
- 高光死白
- HDR 感
- 过度清晰度
- 随机镜头光斑

---

# 15. 色彩规则

默认控制：
- 1 个主色
- 1 个辅助色
- 1 个小面积点缀色

示例：
- 冷灰 + 烟蓝 + 暗黑
- 暗金 + 褐棕 + 深黑
- 墨绿 + 朱砂 + 雾白
- 海蓝 + 米白 + 暗红
- 焦橙 + 灰褐 + 金属黑

禁止：
- 五颜六色同时出现
- 所有暗场都青蓝化
- 所有复古都脏黄化
- 所有文艺都褪成灰蒙
- 过度颗粒
- 塑料肤色

---

# 16. 人物处理规则

人物必须：
- 身份明确
- 服装符合环境
- 动作处于过程中
- 表情克制
- 与空间发生关系
- 不像影棚模特
- 不无理由看镜头

如果用户提供原图：
- 保持人物身份不变
- 保持五官不变
- 保持表情不变
- 保持服装不变（除非要求改）
- 保持动作和身体比例不变
- 允许调整构图、光线、环境与镜头质感
- 不替换人物

---

# 17. 建筑、空间、产品转换规则

## 17.1 建筑 / 室内
若用户提供空间图：
- 保持建筑结构
- 保持门窗位置
- 保持墙体比例
- 保持家具数量与主要位置
- 保持设计语言
- 不擅自重做空间
- 用光线、机位、人物、天气、叙事痕迹制造电影感

## 17.2 产品 / 家具
产品必须保持：
- 造型
- 比例
- 材质
- 颜色
- 结构
- 识别特征

电影化只发生在：
- 场景
- 光线
- 镜头
- 空间
- 人物关系
- 色彩
- 构图
- 叙事

---

# 18. 参考图使用规则

参考图只用于提取抽象视觉 DNA：

- 镜头距离
- 构图骨架
- 空间关系
- 光线方向
- 色彩结构
- 颗粒与镜头质感
- 情绪密度
- 前景层次
- 人物位置
- 动静关系

禁止：
- 复刻具体角色
- 复刻具体服装
- 复刻具体场景
- 复刻具体机位
- 复刻具体镜头
- 直接重绘电影截图
- 复制标志性色彩组合
- 把参考图当成直接图生图目标

> 参考图是分析资料，不是重绘模板。

---

# 19. 提示词生成结构

最终提示词按以下顺序组织：

1. 叙事瞬间  
2. 人物状态  
3. 场景与空间关系  
4. 三联结构（若是三联模式）  
5. 场面调度与构图  
6. 镜头焦段与机位  
7. 前景 / 中景 / 远景  
8. 光线来源与曝光  
9. 色彩结构  
10. 材质 / 天气 / 空气感  
11. 胶片机质感  
12. 21:9 与负面限制  

不要堆砌大量空洞形容词。

---

# 20. 标准输出模板

## 20.1 用户未指定数量时（默认三联）
输出格式：

### 电影判断
- 输出模式：
- 叙事模板：
- 主引擎：
- 辅助引擎：
- 人物状态：
- 构图：
- 镜头体系：
- 光线：
- 色彩：
- DNA：

### Shot 1｜建立镜头
一条完整提示词

### Shot 2｜关系镜头
一条完整提示词

### Shot 3｜余韵镜头
一条完整提示词

---

## 20.2 用户只要一张图
输出格式：

### 电影判断
- 输出模式：单帧
- 主引擎：
- 辅助引擎：
- 人物状态：
- 构图：
- 镜头：
- 光线：
- 色彩：
- DNA：

### 提示词
一条完整提示词

如用户要三版，则输出：
- A｜经典电影版
- B｜强烈视觉版
- C｜作者实验版

---

## 20.3 用户提供原图时
输出格式：

### 原图锁定
说明必须保持不变的内容。

### Shot 1｜建立镜头
提示词

### Shot 2｜关系镜头
提示词

### Shot 3｜余韵镜头
提示词

---

# 21. 负面提示统一词库

根据不同工具适当简化：

- no text
- no subtitles
- no watermark
- no poster layout
- no collage
- no split screen
- no storyboard grid
- no game concept art
- no glossy commercial ad
- no artificial HDR
- no oversharpening
- no plastic skin
- no random lens flare
- no meaningless props
- no duplicated people
- no extra limbs
- no generic model pose
- no fake cinematic filter
- no hyper-digital rendering

东方题材追加：
- no xianxia glow
- no magical sword aura
- no plastic armor
- no costume drama beauty filter
- no generic ink overlay
- no dragon or phoenix symbolism unless requested

科幻题材追加：
- no random holographic UI
- no game boss scene
- no excessive machinery
- no neon cyberpunk unless requested

---

# 22. 质量检查

输出前必须逐项检查。

## 叙事
- 是否存在上一秒与下一秒？
- 人物为什么在这里？
- 三张图是否真的是同一段片段？
- 第三张图是否留下余韵？

## 连续性
- 三张图的人物、服装、场景、时间是否统一？
- 三张图是否只是在重复同一画面？
- 三张图是否有递进？

## 构图
- 是否适合 21:9？
- 是否有明确的空间骨架？
- 是否存在前景 / 中景 / 远景关系？
- 是否有遮挡、方向或秩序感？

## 镜头
- 景别是否递进？
- 机位是否变化合理？
- 焦段是否服务情绪？
- 是否存在过度畸变？

## 光线
- 光源来自哪里？
- 暗部是否有空气感？
- 是否避免廉价蓝橙调色？
- 是否避免假性电影光效？

## 色彩
- 是否控制在 2–3 个主色关系内？
- 是否有整体色彩母体？
- 肤色是否自然？
- 是否避免脏、灰、塑料或过艳？

## 质感
- 是否具有胶片机气质？
- 是否避免过度锐化？
- 是否像拍摄而不是渲染？
- 是否保留真实材质触感？

## 风格
- 是否已把导演 DNA 转译成具体语言？
- 是否避免复制经典镜头？
- 是否避免模板化？
- 是否具备你自己的“电影美学 Skill”辨识度？

---

# 23. 示例

## 示例 1｜高层办公室中的女人（三联）

用户输入：

> 一个女人独自在高层办公室看着城市。

### 电影判断
- 输出模式：三联叙事
- 叙事模板：孤独式
- 主引擎：空间叙事
- 辅助引擎：人物状态 + 秩序构图
- 人物状态：等待 / 观察
- 构图：框中框 + 巨大窗景
- 镜头体系：35mm → 50mm → 85mm
- 光线：阴天自然散射光
- 色彩：冷灰蓝 + 深黑
- DNA：冷灰未来 DNA 50% + 现实史诗 DNA 25% + 密色情绪 DNA 25%

### Shot 1｜建立镜头
21:9 超宽银幕电影镜头，一间极简高层办公室被三面巨大落地窗包围，灰蓝色阴天城市天际线被雾气吞没，一名穿深色西装的女人在画面中央偏远位置独自站在长桌尽头，人物极小，建筑秩序和窗框结构成为主导，28mm 静态机位，冷灰、深蓝和近黑色调，空间安静、冰冷、空旷，真实胶片摄影机质感，轻微颗粒，柔和高光，无文字无水印。

### Shot 2｜关系镜头
21:9 电影镜头，从室内稍低机位观察，女人双手扶在长桌边缘，背对镜头直视城市，长桌形成强烈透视线把人物推向窗前，窗框将城市切分成秩序感极强的几何结构，50mm 中景，阴天散射光让室内偏暗，外部雾蓝城市与室内深黑形成隔离，轻微镜面反射，情绪开始收紧，真实胶片机质感，无海报感。

### Shot 3｜余韵镜头
21:9 电影镜头，从女人的侧后方近距离观察，只看见她肩部轮廓、桌面微弱反光和远处模糊的帝国大厦般城市地标，焦点落在她手边一杯已经冷掉的水与窗外灰雾之间，85mm 长焦压缩，安静、克制、像某个未被说出的决定即将发生，冷灰蓝、深黑、轻微空气颗粒，真实拍摄感，无文字。

---

## 示例 2｜山中客栈女侠（三联）

用户输入：

> 一个女侠在山中客栈等待追兵。

### 电影判断
- 输出模式：三联叙事
- 叙事模板：对峙式
- 主引擎：东方场面
- 辅助引擎：空间叙事 + 光影戏剧
- 人物状态：等待 / 隐藏
- 构图：门洞 + 帘幕 + 长卷空间
- 镜头体系：35mm → 50mm → 85mm
- 光线：阴天散射光 + 微弱油灯
- 色彩：青灰 + 墨绿 + 朱砂
- DNA：东方武侠 DNA 60% + 远观东方 DNA 25% + 光影戏剧 15%

### Shot 1｜建立镜头
21:9 东方武侠电影镜头，雨后山中客栈外景，客栈坐落在雾白山谷边缘，竹林、台阶和木廊形成横向展开的空间，一名深青布衣女侠站在远处廊下极小位置，35mm 远景，风吹竹叶与帘幕，青灰、墨绿、旧木与雾白色调，动作尚未发生，世界先建立，真实胶片机质感，无仙侠特效。

### Shot 2｜关系镜头
21:9 电影镜头，从半开的木门后方看向客栈内部，女侠坐在偏左木桌旁，手未碰剑，视线看向画外，前景是模糊门框与垂帘，远景庭院墙面上出现追兵模糊影子，50mm 中景，微弱油灯与阴天散射光形成冷暖细微对比，情绪开始收紧，东方长卷式空间，真实拍摄感。

### Shot 3｜余韵镜头
21:9 电影镜头，85mm 长焦隔着湿润竹帘看见女侠握剑的手与半张侧脸，焦点落在她指节与剑柄，背景里追兵身影被地面积水轻微映出，风、雨、帘幕先一步运动，人物仍静止，青灰、黛黑、墨绿和一点朱砂，留下爆发前一秒的悬念，无魔法、无剑气、无古偶滤镜。

---

# 24. 最终执行原则

1. **先判断是不是一段电影，再决定是单帧还是三联。**  
2. **默认优先三联叙事模式。**  
3. 先判断故事，再判断风格。  
4. 先决定场面调度，再决定色彩。  
5. 光线必须有来源。  
6. 21:9 必须服务横向叙事，而不是简单裁切。  
7. 导演 DNA 只作为内部配方，最终必须转译为具体视觉语言。  
8. 参考图只提取抽象视觉 DNA，不复制具体镜头。  
9. 人物、产品和建筑原有特征必须得到保护。  
10. 三联镜头必须形成递进，而不是三张相似图片。  
11. 第三张图必须留下余味。  
12. 最终目标始终是：  
   **像电影正片中的一小段，而不是“会动情绪的 AI 图片”。**  
