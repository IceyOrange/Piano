# Piano

> A piano you can actually play, on a homepage that quietly unfolds into more.  
> 一个真的能弹的钢琴，落在主页上，背后藏着几个静静展开的子页面。

A small personal site, hand-written in HTML, CSS, and JS. No build step, no framework — just open in a browser.  
纯手写的小个人站，HTML + CSS + JS，无构建、无框架，浏览器直接打开即用。

## Pages · 页面

- **Home** (`index.html`) — A two-octave piano keyboard (F2–E4). Click or tap to play. A handful of labeled keys long-press to jump into a sub-page; play the right cue and a tribute to *Canon in D* / The Beatles unfolds.  
  **首页** — 两个八度的钢琴键盘 (F2–E4)，点击或触摸即可弹奏。长按特定琴键可跳转到子页面；弹奏特定音符将触发致敬《卡农》与 The Beatles 的动画。
- **Portfolio** (`portfolio.html`) — A magazine-style project showcase. Currently: this site, and *Blue Sky & White Cloud*.  
  **作品集** — 杂志排版风格的项目展示，目前收录本站与《蓝天白云》。
- **Experience** (`experience.html`) — A Marauder's-Map-style timeline drawn over a stylized China map.  
  **足迹** — 活点地图风格的履历时间线，绘制在抽象的中国地图上。
- **About** (`about.html`) — A typewriter intro, a handwritten line, a short bio, social links.  
  **关于我** — 打字机自述、手写体签名、简短介绍与社交链接。
- **Blue Sky & White Cloud** (`BlueSkyWhiteCloud.html`) — A scroll from daylight into a starry night; click meteors at night to summon a falling-star storm and trace constellations.  
  **蓝天白云** — 向下滚动，从白天滑入星空；夜晚点击流星触发漫天星雨，探索星座连线。

The three sub-pages have a quiet **中 / EN** toggle in the top-right nav — preference persists via `localStorage`.  
三个子页面右上角均设有 **中 / EN** 语言切换按钮，选择会通过 `localStorage` 持久保存。

## Run locally · 本地运行

The site uses Web Audio + sampled piano (SoundFont), so it needs a real HTTP server — `file://` won't fetch the audio assets.  
站点使用 Web Audio + 钢琴采样 (SoundFont)，需要通过 HTTP 服务器访问，`file://` 协议无法加载音频资源。

```bash
python3 -m http.server 8080
# or / 或
npx serve .
```

Then open <http://localhost:8080>.  
然后访问 <http://localhost:8080>。

## Layout · 目录结构

```
index.html                 Home — the piano keyboard / 首页 — 钢琴键盘
portfolio.html             Magazine project showcase / 杂志式作品展示
experience.html            Map + role timeline / 地图 + 履历时间线
about.html                 Avatar, typewriter, handwriting, bio / 头像、打字机、手写体、简介
BlueSkyWhiteCloud.html     Scroll-driven day-to-night scene / 滚动驱动的昼夜交替场景

css/styles.css             One stylesheet — tokens, layout, components, animations / 单样式表

js/
  data.js                  Projects, experiences, roles, social — with parallel _En fields
                           / 项目、经历、角色、社交 — 含中英双语字段
  i18n.js                  CN/EN string dictionary, DOM apply, toggle binding
                           / 中英文字典、DOM 渲染、切换绑定
  audio.js                 Web Audio + SoundFont sample playback / 音频播放
  piano.js                 Keyboard rendering; mouse / touch / long-press / 键盘渲染
  canon_data.js            Note schedule for the Canon-in-D / Beatles cue / 卡农音符时序
  sequencer.js             Plays canon_data through audio.js / 卡农音序器
  pages.js                 Renders portfolio, experience, about (lang-aware) / 子页面渲染
  transitions.js           Page-exit overlay + intercepted nav links / 页面过渡动画

assets/
  images/                  Photos, SVGs, favicon, BlueSkyWhiteCloud textures / 图片与纹理
  fonts/                   Local typeface files (Special Elite, etc.) / 本地字体文件
  soundfonts/              Sampled-piano data for audio.js / 钢琴采样数据
  Canon_in_D.mscz          Source MuseScore file used to generate canon_data.js / 卡农源文件

scripts/
  parse_mscz.py            Converts Canon_in_D.mscz → canon_data.js / 解析脚本
```

## Type & motion notes · 字体与动效

- **English titles · 英文标题** — *Special Elite* (typewriter), so the headings sit slightly off-grid like real keystrokes.  
  打字机体，标题略微错落，模仿真实打字效果。
- **Chinese titles · 中文标题** — *Ma Shan Zheng* (brush calligraphy), with `STXingkai / 楷体` system fallbacks. Swaps in automatically when `<html data-lang="zh">`.  
  马善政毛笔楷书，系统降级为 STXingkai / 楷体，`<html data-lang="zh">` 时自动切换。
- **Body / nav · 正文与导航** — *Sintony* on portfolio, *Inter* on experience and about; *Dancing Script* + 行楷 fallback for handwritten accents.  
  作品集用 Sintony，足迹与关于我用 Inter；手写体点缀用 Dancing Script + 行楷降级。
- **Reduced motion · 减少动效** — back/forward navigations set a `prefers-no-animation` class so the page-exit overlay is skipped.  
  浏览器前进/后退时设置 `prefers-no-animation` class，跳过页面退出遮罩动画。
- **Mobile landscape · 移动端横屏** — `index.html` rotates 90° via CSS on portrait phones, so the piano stays usable without forcing the user to flip the device.  
  竖屏手机上通过 CSS 将首页旋转 90°，无需强制横屏即可弹奏。

## Stack · 技术栈

- ~1.6k lines of CSS, ~3k lines of JS. / ~1600 行 CSS，~3000 行 JS
- Cache-busted via `?v=N` query-strings on each `<script>` / `<link>` (bumped when files change).  
  通过 `?v=N` 查询参数管理缓存（文件变更时递增版本号）。
- No build tools, no framework, no package manager. The only dev dependency is a static file server.  
  无构建工具、无框架、无包管理器。唯一的开发依赖是一个静态文件服务器。

## Inspirations · 灵感来源

- A [piano](https://pin.it/FAAK2mtJ5) and a [kitten on a music score](https://pin.it/5Ww8Bq78A) on Pinterest, plus the score on Kimi's [pricing page](https://www.kimi.com/membership/pricing) — for the home page.  
  Pinterest 上的[钢琴](https://pin.it/FAAK2mtJ5)和[曲谱小猫](https://pin.it/5Ww8Bq78A)，以及 Kimi [会员订阅页](https://www.kimi.com/membership/pricing)底部的曲谱 — 启发了首页设计。
- @baothiento's [pond](https://x.com/baothiento/status/2033203600298488136?s=20) and Deserts Chang's *[蓝天白云](https://music.163.com/#/song?id=326697)* — for *Blue Sky & White Cloud*.  
  @baothiento 的[池塘](https://x.com/baothiento/status/2033203600298488136?s=20)和张悬的《[蓝天白云](https://music.163.com/#/song?id=326697)》— 启发了蓝天白云页面。
- Pachelbel's *Canon in D* — for the audio cue, public domain.  
  帕赫贝尔《D大调卡农》— 音频彩蛋，公共领域。

## License · 许可

Personal site. Code is here for inspiration and reference; please don't lift the photos, bio, or sub-pages wholesale.  
个人站点。代码可供参考借鉴；请勿直接搬运照片、个人简介或子页面内容。
