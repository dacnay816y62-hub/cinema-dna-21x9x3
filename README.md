# Cinema DNA 21:9 x 3

**Version:** 3.0.0

把人物、空间、建筑、神话、科幻、运动、动画题材或一句简单剧情，转译成更像真实电影镜头的 **21:9 单帧、三联叙事或九镜故事板**，并可在用户明确要求时继续生成 **片名、带文字主题海报和完整视觉体系封面**。

这个 skill 不是给图片套“电影感滤镜”。它关注的是：摄影机为什么在这里，观众先看见什么，人物被什么空间关系限制，色彩从哪里来，以及三张图之间的剪辑节奏是否真的成立。

> 先判断，再生成。

## Why

很多 AI 图像提示词会把电影感写成：

- cinematic
- dramatic lighting
- film grain
- teal and orange
- shallow depth of field
- epic composition

结果常常变成广告图、游戏概念图、CG 海报，或者三张互不相干的漂亮截图。

`cinema-dna-21x9x3` 把生成流程改成一组可执行的镜头判断：

```text
关系压力
-> 视线流量
-> 受控随机构图
-> 色彩命题
-> 真实摄影方案
-> 三联剪辑节奏
-> 可选：片名与主题海报
-> 反 CG / 反 AI / 反模板化检查
```

## What It Does

默认输出一组 **3 张独立 21:9 镜头**，再纵向拼接成一张三联图。用户要求“9 张讲故事”“九镜”或“九宫格”时，切换到 Nine-Shot Story：先建立连续性圣经与九镜账本，分三批生成 9 张独立镜头，再用脚本拼成 3×3 九宫格；任何失败只补跑对应镜头。

片名与主题海报不是默认流程。只有当用户明确提出“片名、命名、海报、封面、视觉体系、发布主图”等需求时，它才会追加一个补充阶段：

- 根据分镜核心冲突自动生成片名候选
- 选出主片名、英文名和一句 logline
- 从分镜中提炼主视觉符号，而不是把三张图简单拼贴
- 抽象分析参考海报的设计手法，但不复制具体版式、片名、人物姿态或综合色
- 根据电影氛围选择排版方式、字体气质和颜色系统
- 输出带文字主题海报 prompt
- 主海报固定 3:4 竖版比例，并给出 16:9、1:1、9:16 的扩展封面规则

每张镜头都要求回答：

- 观众站在哪里？
- 谁在看谁，谁知道得更多？
- 视线从哪里进入画面？
- 什么东西改变视线速度？
- 视线最终落到哪个决定性信息？
- 哪些信息保留在边缘、反射、遮挡或失焦中？
- 色彩来自场景、服装、天气还是实景光源？
- 这张图为什么不像广告、游戏、CG 或电视剧？

## Core Rules

### 1. Composition Comes From Pressure

构图不是装饰。先判断人物与空间之间的权力关系，再决定机位。

常用压力类型包括：

- 被观察：门缝、玻璃、人群、监视位置
- 被困住：桌面、走廊、台阶、座椅、制度空间
- 关系疏离：两人之间的空桌、玻璃、地面、床或长廊
- 权力不对等：巨大墙面、台阶、旗位、宗教或政治空间
- 心理失衡：贴边、过多头顶空间、焦点落在背景
- 感官插入：手、汗水、鞋、衣料、头盔、器械边缘

### 2. Every Frame Needs Visual Traffic

每张图先写一句“视线流量”：

```text
视线从 A 进入，被 B 放慢或遮挡，落到 C，最后被 D 带走。
```

如果这句话写不清，说明构图只是元素堆叠。

### 3. Random, But Not Template Random

当用户说“随机”“发散”“自己想题材”时，skill 不会直接抽远景、中景、特写模板。

它会先分析：

- 题材天然的运动方向
- 角色与环境的权力关系
- 观众应该站在事件内部、外部、错误一侧，还是反射/设备内部
- 当前题材最独特的视线入口、阻断点、落点和出口
- 哪些镜头会变成上一组的重复套路

然后再受控随机出构图策略。

### 4. Shot 3 Is Not Always A Dead Object

旧版本容易把第三张做成“空房间 + 主人公物件 + 悬疑余韵”。现在必须避免这个套路。

第三张可以是：

- 身体压力后的喘息
- 群体视线或集体反应
- 关系站位发生变化
- 现场继续运行
- 规则被临时改写
- 人物没有解释，但行动已经变了

物件残留仍然可用，但不能成为默认公式。

### 5. Color Is A Narrative Decision

色彩必须来自画面内部：

- 服装
- 墙体
- 天气
- 实景灯
- 水面、雪地、玻璃、植物反射
- 时代材料

不要默认蓝灰阴冷，也不要靠后期滤镜制造“高级感”。

### 6. IP And Style Safety

可以做“动画片感”“手工木偶感”“黑色幽默”“童话”“科幻运动”等方向，但不要复刻现成 IP。

推荐做法：

- 把“某大厂动画风格”转译成材质、表情、布景、色彩和镜头调度
- 避开具体角色组合、职业设定、城市系统和标志性场景骨架
- 用原创主角、原创世界规则和原创冲突

例如：

```text
手工木偶定格 + 水彩纸背景 + 欧洲小剧场插画
```

比直接写某个动画工作室或某部电影更安全，也更可控。

## Example Gallery

### Selected Favorites

这些示例来自多轮测试后的精选结果。它们更强调三联节奏、构图流量、群体叙事、运动压力和真实场景里的综合色，而不是单张漂亮截图。

![Mexico rodeo family rope triptych](examples/mexico-rodeo-family-rope-triptych.jpg)

![Seventies TV dance marathon triptych](examples/seventies-tv-dance-marathon-triptych.jpg)

![Tropical court greenhouse triptych](examples/tropical-court-greenhouse-triptych.jpg)

![American football optical pressure triptych](examples/american-football-optical-pressure-triptych.jpg)

![Laundromat note triptych](examples/laundromat-note-triptych.jpg)

![Rain courtyard ledger triptych](examples/rain-courtyard-ledger-triptych.jpg)

![Apartment family table triptych](examples/apartment-family-table-triptych.jpg)

![Train window departure triptych](examples/train-window-departure-triptych.jpg)

![Monastic observatory window triptych](examples/monastic-observatory-window-triptych.jpg)

### Anti-template Rhythm Tests

这组用于修正“第三张总是物件残留”的问题。收尾改为人物、群体、身体压力和公共现场继续运行。

![Non-residue rhythm overview](examples/non-residue-rhythm-overview.jpg)

### Sci-fi Ice Ring Mine City

科幻星球不靠霓虹和巨构奇观，而是用矿车时刻表、成人礼队伍和冰环环境制造制度压力。

![Sci-fi ice ring mine city triptych](examples/scifi-ice-ring-mine-city-triptych.jpg)

### Original Anthropomorphic Animal Theater

拟人动物可以有 IP 感、表情和服装，但避开现成动物都市设定。这里转成河港小剧场和手作舞台逻辑。

![Anthro harbor theater triptych](examples/anthro-harbor-theater-triptych.jpg)

### Sci-fi Underwater Football

运动题材不固定为“背影、主观、脸部特写”。水下穹顶足球用球、阀门、队友人墙和规则故障形成动作节奏。

![Sci-fi underwater football triptych](examples/scifi-underwater-football-triptych.jpg)

### Bagua Sea Platform

东方玄学题材不使用发光法术和游戏化对决，而用潮水、站位、宗派距离和八卦地面关系表达权力变化。

![Bagua sea platform triptych](examples/bagua-sea-platform-triptych.jpg)

### Earlier Favorites

![Hotel pink ritual triptych](examples/hotel-pink-ritual-triptych.jpg)

![Army fisheye first-person triptych](examples/army-fisheye-first-person-triptych.png)

![Courthouse witness triptych](examples/courthouse-witness-triptych.png)

![Green water memory triptych](examples/green-water-memory-triptych.png)

![Journey West original epic triptych](examples/journey-west-original-epic-triptych.png)

## Typical Requests

```text
用 cinema-dna 生成一组：科幻足球，球场在水下穹顶里。
```

```text
随机测试 5 组，题材和色调拉开，至少一组构图巧妙。
```

```text
做一个拟人动物动画片感，但不要抄疯狂动物城。
```

```text
根据这张参考图，只抽取构图，不要复用人物、配色和道具。
```

```text
这组三联第三张不要再做空场物件，保持人物和群体还在动作里。
```

```text
给这组电影分镜自动取名，再补一张带文字主题海报和完整视觉体系封面。
```

## Output Format

默认生成：

```text
Shot 1: independent 21:9 frame
Shot 2: independent 21:9 frame
Shot 3: independent 21:9 frame
Final: vertical triptych stitched from the three frames
Optional: title candidates + theme poster + visual-system cover
```

默认拼接规则：

- 单张为 21:9 或 2.39:1
- 三张纵向拼接
- 黑色间隔 8-12 px
- 不加字幕、不加序号、不加水印、不加装饰边框

若启用主题海报阶段，默认采用两段式：先生成主视觉底图，再用排版工具叠加准确片名和小字。直接让图像模型画文字时，只使用一个短片名，并预留后期校正空间。

主题海报的主海报固定为 **3:4 竖版比例**。海报 prompt 必须写明 `3:4 vertical poster composition`；16:9、1:1、9:16 只作为后续视觉体系扩展封面，不替代主海报比例。

海报参考图只用于抽象方法分析，例如大留白、标题压住人物、书写笔触、文字穿插景深、单色底与高饱和点睛色、胶片颗粒、旧纸感和小人对巨型环境。它不会复用参考图的具体构图、片名、IP、人物关系、物件组合或字体轮廓。

海报设计会先判断电影气质，再决定视觉系统：

- 亲密记忆：大留白、细衬线、褪色蓝或旧照片暖灰
- 犯罪黑色幽默：粗窄大字、人物被标题压住、黑/脏白/血红
- 史诗权力崩塌：巨大笔触或符号、人物缩小、黑/朱红/金
- 东方水墨历史：宣纸留白、墨块压境、竖排或边栏小字
- 青春旅行：轻盈手写或明亮无衬线、草绿/天蓝/日光黄
- 科幻制度焦虑：几何无衬线、界面感网格、冷蓝/紫灰/荧光点睛
- 体育速度：压缩粗体、文字参与运动方向、场地原色加队服高亮
- 温暖生活：标题不压迫人物、温和字体、暖白/木色/旧胶片黄

## Prompt Structure

每张图的最终英文 prompt 通常包含：

```text
1. frame format and capture base
2. specific time, place, characters
3. visible action and unfinished state
4. camera position, focal length, distance, scale
5. main composition pressure
6. practical light source
7. color thesis
8. real materials and optical constraints
9. negative constraints
```

## What This Skill Avoids

- CG concept art
- game key art
- AI wallpaper
- overly glossy skin
- generic teal-orange grading
- excessive fog, particles and rim light
- fashion/editorial posing when the task needs story
- TV drama blocking
- copying a specific director shot or existing IP
- always ending with an abandoned object
- turning the film poster into a simple storyboard collage
- using generic AI-film titles instead of story-driven names
- relying on image models for dense, accurate small text

## Repository Contents

- `SKILL.md` - main skill instructions used by Codex
- `references/` - extended cinema grammar and anti-AI film-frame patches
- `scripts/` - deterministic nine-shot contact-sheet composition
- `agents/` - Codex UI metadata
- `examples/` - compressed README example images

## Privacy And Safety

Public examples are renamed with descriptive titles and recompressed without source metadata. The README avoids local machine paths, usernames, temporary filenames and chat/export traces.

## Install

Copy this folder into your Codex skills directory:

```powershell
Copy-Item -Recurse . "$env:USERPROFILE\.codex\skills\cinema-dna-21x9x3"
```

If your Codex home has moved to another drive, set `CODEX_HOME` and copy into that skill directory:

```powershell
Copy-Item -Recurse . "$env:CODEX_HOME\skills\cinema-dna-21x9x3"
```

## Design Principle

真正高级的画面不需要每一处都精彩。

它只需要一个决定足够准确：摄影机在正确的位置，拍到了人物与空间关系发生变化的那一刻。
