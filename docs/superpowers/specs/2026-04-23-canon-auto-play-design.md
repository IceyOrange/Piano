# Canon in D 自动演奏 — 设计文档

**日期**: 2026-04-23
**范围**: 点击五线谱上的小猫图标，自动演奏 `Canon_in_D.mscz` 曲谱，同步琴键动画

---

## 目标

用户点击首页 Piano Landing Page.svg 中名为 "Oh Cat!" 的 SVG 组时，网站自动按 `Canon_in_D.mscz` 的曲谱顺序播放音乐，同时当前可见钢琴键盘（F2–E4）上对应的琴键产生下压动画。音不在画面内的音符照常演奏，不降调、不扩展键盘。

---

## 范围

- **包含**: mscz 解析、序列器调度、音频引擎扩展、琴键视觉同步、小猫点击交互
- **不包含**: 播放进度条、速度调节、循环播放、多轨道混音、移动端适配优化

---

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                        数据层                                │
│  scripts/parse_mscz.py  →  js/canon_data.js (预解析)        │
│  1566 条音符记录: {time, duration, midi, note, hasKey}      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      序列器 (Sequencer)                      │
│  js/sequencer.js                                            │
│  - start(): 按时间调度每个音符的音频 + 视觉事件               │
│  - stop():  中断播放，清除所有 pending timeout               │
│  - toggle(): 小猫点击入口，切换播放/停止                     │
└─────────────────────────────────────────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌──────────────────────────────┐
│      音频引擎            │  │        视觉层                 │
│  js/audio.js             │  │  js/piano.js                  │
│  - playNoteMidi()        │  │  - pressKeyVisual()            │
│    支持全音域 MIDI→频率   │  │  - releaseKeyVisual()          │
│    自定义时长 envelope    │  │  - releaseAllKeysVisual()      │
│  - playNote() (保留)     │  │  - 小猫 click → toggle()       │
└─────────────────────────┘  └──────────────────────────────┘
```

---

## 数据解析与格式

### MuseScore XML 结构

`<Staff id="1">`（右手，高音谱号）：MIDI 52–96（E3–C7）
`<Staff id="2">`（左手，低音谱号）：MIDI 36–76（C2–E5）

每个 `<Chord>` 可包含多个 `<Note>`，同一 `<Chord>` 内的音符共享起始时间，天然形成和弦。

### 解析规则

1. **时间计算**：`<Division>480</Division>` 表示每个四分音符 = 480 ticks。BPM = 77。
   - tick → ms: `tick * (60 / BPM) / 480 * 1000`
2. **时长映射**：
   - `measure` = 1920 ticks（全小节，4/4 拍）, `half` = 960, `quarter` = 480, `eighth` = 240, `16th` = 120
   - 带 `<dot/>` 的点音符：× 1.5
3. **休止符（Rest）**：遇到 `<Rest>` 不生成音符，但累加 tick 推进时间
4. **连音线（Tie）**：53 处连音线暂不处理，分开播放。对听觉影响极小（见已知限制）
3. **MIDI → note name**：使用标准 MIDI 映射（C4 = 60），映射到 piano.js 现有的命名体系
4. **`hasKey`**：MIDI 41–64（F2–E4）标记 `true`，其余标记 `false`

### 输出格式

```javascript
// js/canon_data.js
window.PianoApp.canonSequence = [
  { time: 0, duration: 1250, midi: 64, note: "E4", hasKey: true },
  { time: 0, duration: 1250, midi: 52, note: "E3", hasKey: true },
  { time: 625, duration: 625, midi: 60, note: "C4", hasKey: true },
  // ... 共 1566 条
];
```

数据量约 40–60KB。

---

## 音频引擎扩展

### 新增 `playNoteMidi(midi, durationMs, when)`

```javascript
window.PianoApp.playNoteMidi = function(midi, durationMs, when) {
  const ctx = window.PianoApp.audioCtx;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const start = when || ctx.currentTime;
  const dur = durationMs / 1000;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, start);
  masterGain.gain.linearRampToValueAtTime(0.35, start + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  masterGain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(freq, start);
  osc1.connect(masterGain);
  osc1.start(start);
  osc1.stop(start + dur);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, start);
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, start);
  gain2.gain.linearRampToValueAtTime(0.08, start + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.001, start + Math.min(dur, 1.0));
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(start);
  osc2.stop(start + Math.min(dur, 1.0));
};
```

- `midi`: MIDI note number (0–127)
- `durationMs`: 音符时长（毫秒），来自曲谱
- `when`: AudioContext 绝对时间，用于精确调度

### 现有 `playNote(noteName)` 保持不变

继续用于键盘点击和键盘和弦绑定，不影响已有交互。

---

## 序列器与播放控制

### 状态机

```
[Idle] --click--> [Playing] --click--> [Idle]
                        --end-of-sequence--> [Idle]
```

### 实现

```javascript
window.PianoApp.Sequencer = {
  isPlaying: false,
  timeouts: [],

  start() {
    const ctx = window.PianoApp.audioCtx;
    const startTime = ctx.currentTime;
    const seq = window.PianoApp.canonSequence;

    this.isPlaying = true;

    seq.forEach(note => {
      // 音频精确调度（AudioContext 时间）
      const audioDelay = note.time / 1000;
      window.PianoApp.playNoteMidi(note.midi, note.duration, startTime + audioDelay);

      // 视觉反馈调度（setTimeout，需操作 DOM）
      const visualTimer = setTimeout(() => {
        if (!this.isPlaying) return;
        if (note.hasKey) {
          window.PianoApp.pressKeyVisual(note.note);
        }
        setTimeout(() => {
          if (note.hasKey) window.PianoApp.releaseKeyVisual(note.note);
        }, note.duration);
      }, note.time);

      this.timeouts.push(visualTimer);
    });

    // 自动复位
    const last = seq[seq.length - 1];
    const endTimer = setTimeout(() => {
      this.isPlaying = false;
      this.timeouts = [];
    }, last.time + last.duration + 100);
    this.timeouts.push(endTimer);
  },

  stop() {
    this.isPlaying = false;
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
    window.PianoApp.releaseAllKeysVisual();
  },

  toggle() {
    this.isPlaying ? this.stop() : this.start();
  }
};
```

### 设计要点

- **音频与视觉分离**：音频走 `AudioContext.currentTime`，精确到采样级；视觉走 `setTimeout`，因为需要操作 DOM
- **可中断**：`stop()` 清除所有未触发的 timeout，立即释放琴键
- **自动结束**：序列完毕后自动复位
- **和弦支持**：同一时刻的多条记录独立调度，天然同时触发
- **并发安全**：手动按琴键/键盘和弦与自动播放互不干扰

---

## UI 集成

### 小猫点击事件

在 `piano.js` SVG 加载完成后：

```javascript
const ohCat = visualSvg.getElementById('Oh Cat!');
if (ohCat) {
  ohCat.style.cursor = 'pointer';
  ohCat.addEventListener('click', () => {
    window.PianoApp.Sequencer.toggle();
  });
}
```

### 琴键视觉反馈

新增纯净的视觉函数（不混入导航长按逻辑）：

```javascript
window.PianoApp.pressKeyVisual = function(note) {
  const group = svg.querySelector(`[data-note="${note}"]`);
  if (group && !isBlackKey(note)) group.classList.add('pressed');
  setVisualState(note, 'pressed', true);
};

window.PianoApp.releaseKeyVisual = function(note) {
  const group = svg.querySelector(`[data-note="${note}"]`);
  if (group && !isBlackKey(note)) group.classList.remove('pressed');
  setVisualState(note, 'pressed', false);
};

window.PianoApp.releaseAllKeysVisual = function() {
  whiteKeys.forEach(k => window.PianoApp.releaseKeyVisual(k.note));
};
```

- 白键：添加 `.pressed` 类触发 CSS 下压动画
- 黑键：只调用 `setVisualState` 改变 SVG fill（或直接跳过，保持现有规则）
- 超出键盘范围（`hasKey: false`）：不触发任何视觉函数

---

## 文件变更清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `scripts/parse_mscz.py` | 新建 | 一次性 Python 解析脚本 |
| `js/canon_data.js` | 新建 | 音符序列数据，Python 生成 |
| `js/sequencer.js` | 新建 | 序列器逻辑 |
| `js/audio.js` | 修改 | 新增 `playNoteMidi` |
| `js/piano.js` | 修改 | 新增视觉函数 + 小猫 click 事件 |
| `index.html` | 修改 | 引入 `sequencer.js` |

---

## 错误处理

1. **mscz 文件缺失**：Python 脚本报错退出，需手动确认文件路径
2. **canon_data.js 缺失**：浏览器控制台报错 `window.PianoApp.canonSequence is undefined`，不影响其他功能
3. **AudioContext 未初始化**：`playNoteMidi` 内部调用 `initAudio()`，用户首次点击小猫时会自动 resume
4. **"Oh Cat!" 组不存在**：静默跳过，不绑定事件，控制台 warning
5. **播放中断时的视觉残留**：`stop()` 调用 `releaseAllKeysVisual()` 确保所有白键复位

---

## 音域说明

| 部分 | MIDI 范围 | 音符范围 | 琴键动画 |
|------|-----------|----------|----------|
| 左手 (Staff 2) | 36–76 | C2–E5 | 41–64 有动画，其余无 |
| 右手 (Staff 1) | 52–96 | E3–C7 | 41–64 有动画，其余无 |
| **总计** | **36–96** | **C2–C7** | **约 38% 有动画** |

---

## 已知限制

1. **同一琴键重叠音符的视觉冲突**：如果同一个白键在短时间内被连续按下（如 legato），前一条音符的 `releaseKeyVisual` 可能过早释放后一条音符的 pressed 状态。Canon in D 中此情况极少，不影响整体体验。
2. **手动交互与自动播放的视觉冲突**：用户在自动播放期间手动点击琴键，自动播放的 `releaseAllKeysVisual()` 可能会把用户手动按下的琴键一并释放。这是可接受的，因为自动播放和手动演奏是独立的音频流。
3. **连音线（Tie）未处理**：53 处连音线被拆分为独立音符播放，中间有极短的 envelope 重新 attack。对于 Web Audio 合成器来说，这个断音几乎不可察觉。
