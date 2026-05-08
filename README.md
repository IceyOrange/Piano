# Piano

> A piano you can actually play, on a homepage that quietly unfolds into more.  
> 一个真的能弹的钢琴，落在主页上，背后藏着几个静静展开的子页面。

---

## Pages

- **Home** (`index.html`) — A two-octave piano keyboard (F2–E4). Click or tap to play. A handful of labeled keys long-press to jump into a sub-page; play the right cue and a tribute to *Canon in D* / The Beatles unfolds.
- **Portfolio** (`portfolio.html`) — A magazine-style project showcase. Currently: this site, and *Blue Sky & White Cloud*.
- **Experience** (`experience.html`) — A Marauder's-Map-style timeline drawn over a stylized China map.
- **About** (`about.html`) — A typewriter intro, a handwritten line, a short bio, social links.
- **Blue Sky & White Cloud** (`BlueSkyWhiteCloud.html`) — A scroll from daylight into a starry night; click meteors at night to summon a falling-star storm and trace constellations.

The three sub-pages have a quiet **中 / EN** toggle in the top-right nav — preference persists via `localStorage`.

## Run locally

The site uses Web Audio + sampled piano (SoundFont), so it needs a real HTTP server — `file://` won't fetch the audio assets.

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open <http://localhost:8080>.

## Layout

```
index.html                 Home — the piano keyboard
portfolio.html             Magazine project showcase
experience.html            Map + role timeline
about.html                 Avatar, typewriter, handwriting, bio
BlueSkyWhiteCloud.html     Scroll-driven day-to-night scene

css/styles.css             One stylesheet — tokens, layout, components, animations

js/
  data.js                  Projects, experiences, roles, social — with parallel _En fields
  i18n.js                  CN/EN string dictionary, DOM apply, toggle binding
  audio.js                 Web Audio + SoundFont sample playback
  piano.js                 Keyboard rendering; mouse / touch / long-press
  canon_data.js            Note schedule for the Canon-in-D / Beatles cue
  sequencer.js             Plays canon_data through audio.js
  pages.js                 Renders portfolio, experience, about (lang-aware)
  transitions.js           Page-exit overlay + intercepted nav links

assets/
  images/                  Photos, SVGs, favicon, BlueSkyWhiteCloud textures
  fonts/                   Local typeface files (Special Elite, etc.)
  soundfonts/              Sampled-piano data for audio.js
  Canon_in_D.mscz          Source MuseScore file used to generate canon_data.js

scripts/
  parse_mscz.py            Converts Canon_in_D.mscz → canon_data.js
```

## Type & motion notes

- **English titles** — *Special Elite* (typewriter), so the headings sit slightly off-grid like real keystrokes.
- **Chinese titles** — *Ma Shan Zheng* (brush calligraphy), with `STXingkai / 楷体` system fallbacks. Swaps in automatically when `<html data-lang="zh">`.
- **Body / nav** — *Sintony* on portfolio, *Inter* on experience and about; *Dancing Script* + 行楷 fallback for handwritten accents.
- **Reduced motion** — back/forward navigations set a `prefers-no-animation` class so the page-exit overlay is skipped.
- **Mobile landscape** — `index.html` rotates 90° via CSS on portrait phones, so the piano stays usable without forcing the user to flip the device.

## Stack

- ~1.6k lines of CSS, ~3k lines of JS.
- Cache-busted via `?v=N` query-strings on each `<script>` / `<link>` (bumped when files change).
- No build tools, no framework, no package manager. The only dev dependency is a static file server.

## Inspirations

- A [piano](https://pin.it/FAAK2mtJ5) and a [kitten on a music score](https://pin.it/5Ww8Bq78A) on Pinterest, plus the score on Kimi's [pricing page](https://www.kimi.com/membership/pricing) — for the home page.
- @baothiento's [pond](https://x.com/baothiento/status/2033203600298488136?s=20) and Deserts Chang's *[蓝天白云](https://music.163.com/#/song?id=326697)* — for *Blue Sky & White Cloud*.
- Pachelbel's *Canon in D* — for the audio cue, public domain.

## License

Personal site. Code is here for inspiration and reference; please don't lift the photos, bio, or sub-pages wholesale.

---

<br>

# 中文

> 一个真的能弹的钢琴，落在主页上，背后藏着几个静静展开的子页面。

纯手写的小个人站，HTML + CSS + JS，无构建、无框架，浏览器直接打开即用。

## 页面

- **首页** (`index.html`) — 两个八度的钢琴键盘 (F2–E4)，点击或触摸即可弹奏。长按特定琴键可跳转到子页面；弹奏特定音符将触发致敬《卡农》与 The Beatles 的动画。
- **作品集** (`portfolio.html`) — 杂志排版风格的项目展示，目前收录本站与《蓝天白云》。
- **足迹** (`experience.html`) — 活点地图风格的履历时间线，绘制在抽象的中国地图上。
- **关于我** (`about.html`) — 打字机自述、手写体签名、简短介绍与社交链接。
- **蓝天白云** (`BlueSkyWhiteCloud.html`) — 向下滚动，从白天滑入星空；夜晚点击流星触发漫天星雨，探索星座连线。

三个子页面右上角均设有 **中 / EN** 语言切换按钮，选择会通过 `localStorage` 持久保存。

## 本地运行

站点使用 Web Audio + 钢琴采样 (SoundFont)，需要通过 HTTP 服务器访问，`file://` 协议无法加载音频资源。

```bash
python3 -m http.server 8080
# 或
npx serve .
```

然后访问 <http://localhost:8080>。

## 目录结构

```
index.html                 首页 — 钢琴键盘
portfolio.html             杂志式作品展示
experience.html            地图 + 履历时间线
about.html                 头像、打字机、手写体、简介
BlueSkyWhiteCloud.html     滚动驱动的昼夜交替场景

css/styles.css             单样式表

js/
  data.js                  项目、经历、角色、社交 — 含中英双语字段
  i18n.js                  中英文字典、DOM 渲染、切换绑定
  audio.js                 音频播放
  piano.js                 键盘渲染（鼠标/触摸/长按）
  canon_data.js            卡农音符时序
  sequencer.js             卡农音序器
  pages.js                 子页面渲染（语言感知）
  transitions.js           页面过渡动画

assets/
  images/                  图片与纹理
  fonts/                   本地字体文件
  soundfonts/              钢琴采样数据
  Canon_in_D.mscz          卡农源文件

scripts/
  parse_mscz.py            解析脚本
```

## 字体与动效

- **英文标题** — *Special Elite* 打字机体，标题略微错落，模仿真实打字效果。
- **中文标题** — *Ma Shan Zheng* 马善政毛笔楷书，系统降级为 STXingkai / 楷体，`<html data-lang="zh">` 时自动切换。
- **正文与导航** — 作品集用 *Sintony*，足迹与关于我用 *Inter*；手写体点缀用 *Dancing Script* + 行楷降级。
- **减少动效** — 浏览器前进/后退时设置 `prefers-no-animation` class，跳过页面退出遮罩动画。
- **移动端横屏** — 竖屏手机上通过 CSS 将首页旋转 90°，无需强制横屏即可弹奏。

## 技术栈

- ~1600 行 CSS，~3000 行 JS。
- 通过 `?v=N` 查询参数管理缓存（文件变更时递增版本号）。
- 无构建工具、无框架、无包管理器。唯一的开发依赖是一个静态文件服务器。

## 灵感来源

- Pinterest 上的[钢琴](https://pin.it/FAAK2mtJ5)和[曲谱小猫](https://pin.it/5Ww8Bq78A)，以及 Kimi [会员订阅页](https://www.kimi.com/membership/pricing)底部的曲谱 — 启发了首页设计。
- @baothiento 的[池塘](https://x.com/baothiento/status/2033203600298488136?s=20)和张悬的《[蓝天白云](https://music.163.com/#/song?id=326697)》— 启发了蓝天白云页面。
- 帕赫贝尔《D大调卡农》— 音频彩蛋，公共领域。

## 许可

个人站点。代码可供参考借鉴；请勿直接搬运照片、个人简介或子页面内容。
