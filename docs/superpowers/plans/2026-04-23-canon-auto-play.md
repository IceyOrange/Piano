# Canon in D 自动演奏实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击五线谱上的小猫图标，自动演奏 Canon in D，同步琴键动画

**Architecture:** 预解析 mscz 生成 JS 数据模块 → 序列器按时间调度音频+视觉 → 音频引擎支持全音域 MIDI → 琴键视觉反馈

**Tech Stack:** Python 3, Vanilla JS, Web Audio API, SVG DOM

---

## 文件结构

| 文件 | 动作 | 职责 |
|------|------|------|
| `scripts/parse_mscz.py` | 新建 | 解析 mscz XML，生成音符序列 JS 文件 |
| `js/canon_data.js` | 新建 | 1566 条音符序列数据（Python 生成，不手写） |
| `js/sequencer.js` | 新建 | 序列器：调度播放、中断、状态管理 |
| `js/audio.js` | 修改 | 新增 `playNoteMidi` 支持全音域 MIDI + 自定义时长 |
| `js/piano.js` | 修改 | 新增琴键视觉函数 + 小猫 click 事件绑定 |
| `index.html` | 修改 | 引入 `sequencer.js` |

---

### Task 1: Python 解析脚本

**Files:**
- Create: `scripts/parse_mscz.py`

**前置条件:** `assets/Canon_in_D.mscz` 已存在于项目中

- [ ] **Step 1: 写 Python 解析脚本**

```python
#!/usr/bin/env python3
"""Parse Canon_in_D.mscz into js/canon_data.js"""
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

MSCZ_PATH = Path("assets/Canon_in_D.mscz")
OUTPUT_PATH = Path("js/canon_data.js")

DURATION_MAP = {
    "measure": 1920,
    "whole": 1920,
    "half": 960,
    "quarter": 480,
    "eighth": 240,
    "16th": 120,
    "32nd": 60,
}

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def midi_to_note_name(midi):
    """Convert MIDI pitch to note name like 'C4', 'F#2'."""
    name = NOTE_NAMES[midi % 12]
    octave = (midi // 12) - 1
    return f"{name}{octave}"


def duration_to_ticks(duration_type, has_dot=False):
    """Convert MuseScore durationType to ticks."""
    base = DURATION_MAP.get(duration_type, 480)
    if has_dot:
        base = int(base * 1.5)
    return base


def parse_mscz(mscz_path):
    """Extract and parse the mscx XML from mscz."""
    with zipfile.ZipFile(mscz_path, "r") as zf:
        mscx_files = [n for n in zf.namelist() if n.endswith(".mscx")]
        if not mscx_files:
            raise ValueError("No .mscx file found in mscz")
        with zf.open(mscx_files[0]) as f:
            tree = ET.parse(f)
    return tree


def extract_sequence(tree):
    """Extract note sequence from parsed mscx."""
    root = tree.getroot()

    # Get Division (ticks per quarter note)
    division_el = root.find(".//Division")
    division = int(division_el.text) if division_el is not None else 480

    # Get tempo
    tempo_els = root.findall(".//Tempo/tempo")
    tempo = float(tempo_els[0].text) if tempo_els else 1.28333
    bpm = tempo * 60  # tempo is quarters per second

    sequence = []
    current_tick = 0

    # Iterate all Staff elements
    for staff in root.findall(".//Staff"):
        staff_id = staff.get("id")
        staff_tick = 0

        for measure in staff.findall("Measure"):
            measure_tick = 0
            measure_elements = []

            # Collect all elements in voice order
            for voice in measure.findall("voice"):
                voice_tick = 0
                for child in voice:
                    tag = child.tag
                    if tag == "Chord":
                        dt_el = child.find("durationType")
                        duration_type = dt_el.text if dt_el is not None else "quarter"
                        has_dot = child.find("dot") is not None
                        ticks = duration_to_ticks(duration_type, has_dot)

                        notes = child.findall("Note")
                        for note in notes:
                            pitch_el = note.find("pitch")
                            if pitch_el is not None:
                                midi = int(pitch_el.text)
                                note_name = midi_to_note_name(midi)
                                has_key = 41 <= midi <= 64
                                sequence.append({
                                    "time": int(staff_tick + voice_tick),
                                    "duration": int(ticks * (60 / bpm) / division * 1000),
                                    "midi": midi,
                                    "note": note_name,
                                    "hasKey": has_key,
                                })

                        voice_tick += ticks

                    elif tag == "Rest":
                        dt_el = child.find("durationType")
                        duration_type = dt_el.text if dt_el is not None else "quarter"
                        has_dot = child.find("dot") is not None
                        ticks = duration_to_ticks(duration_type, has_dot)
                        voice_tick += ticks

                measure_tick = max(measure_tick, voice_tick)

            staff_tick += measure_tick

    # Sort by time, then group by time for chords
    sequence.sort(key=lambda x: x["time"])

    # Convert tick-based times to ms
    for item in sequence:
        item["time"] = int(item["time"] * (60 / bpm) / division * 1000)

    return sequence


def write_js(sequence, output_path):
    """Write sequence as a JS module."""
    lines = [
        "window.PianoApp = window.PianoApp || {};",
        "",
        f"// Auto-generated from Canon_in_D.mscz — {len(sequence)} notes",
        "window.PianoApp.canonSequence = [",
    ]
    for item in sequence:
        lines.append(
            f'  {{ time: {item["time"]}, duration: {item["duration"]}, midi: {item["midi"]}, note: "{item["note"]}", hasKey: {str(item["hasKey"]).lower()} }},'
        )
    lines.append("];")
    lines.append("")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(sequence)} notes to {output_path}")


if __name__ == "__main__":
    tree = parse_mscz(MSCZ_PATH)
    sequence = extract_sequence(tree)
    write_js(sequence, OUTPUT_PATH)
```

- [ ] **Step 2: 运行脚本生成数据文件**

Run:
```bash
python3 scripts/parse_mscz.py
```

Expected output:
```
Wrote 1566 notes to js/canon_data.js
```

Verify the file exists and contains data:
```bash
head -5 js/canon_data.js && echo "..." && tail -3 js/canon_data.js
```

- [ ] **Step 3: Commit**

```bash
git add scripts/parse_mscz.py js/canon_data.js
git commit -m "feat: add Canon in D mscz parser and generated note sequence"
```

---

### Task 2: 扩展音频引擎

**Files:**
- Modify: `js/audio.js`

- [ ] **Step 1: 添加 `playNoteMidi` 函数**

在 `js/audio.js` 末尾、`playNote` 函数之后添加：

```javascript
window.PianoApp.playNoteMidi = function (midi, durationMs, when) {
  window.PianoApp.initAudio();
  const ctx = window.PianoApp.audioCtx;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const start = when || ctx.currentTime;
  const dur = Math.max(durationMs / 1000, 0.05); // minimum 50ms

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, start);
  masterGain.gain.linearRampToValueAtTime(0.35, start + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  masterGain.connect(ctx.destination);

  // Primary oscillator
  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(freq, start);
  osc1.connect(masterGain);
  osc1.start(start);
  osc1.stop(start + dur);

  // Secondary oscillator (sine, octave up)
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

- [ ] **Step 2: 浏览器控制台验证**

打开浏览器，进入首页，在控制台运行：
```javascript
window.PianoApp.playNoteMidi(60, 500); // C4, 500ms
```

Expected: 听到 C4 音，约 500ms 后衰减消失

再测试高八度：
```javascript
window.PianoApp.playNoteMidi(72, 300); // C5, 300ms
```

Expected: 听到 C5 音

再测试低音：
```javascript
window.PianoApp.playNoteMidi(36, 500); // C2, 500ms
```

Expected: 听到低沉的 C2 音

- [ ] **Step 3: Commit**

```bash
git add js/audio.js
git commit -m "feat: add playNoteMidi for full-range MIDI playback"
```

---

### Task 3: 新建序列器

**Files:**
- Create: `js/sequencer.js`

- [ ] **Step 1: 写序列器代码**

```javascript
window.PianoApp = window.PianoApp || {};

window.PianoApp.Sequencer = {
  isPlaying: false,
  timeouts: [],

  start() {
    if (this.isPlaying) return;
    if (!window.PianoApp.canonSequence) {
      console.error("Canon sequence not loaded");
      return;
    }

    const ctx = window.PianoApp.audioCtx;
    const startTime = ctx ? ctx.currentTime : 0;
    const seq = window.PianoApp.canonSequence;

    this.isPlaying = true;

    seq.forEach((note) => {
      // Schedule audio using AudioContext time for precision
      const audioDelay = note.time / 1000;
      window.PianoApp.playNoteMidi(note.midi, note.duration, startTime + audioDelay);

      // Schedule visual feedback using setTimeout (needs DOM access)
      const visualTimer = setTimeout(() => {
        if (!this.isPlaying) return;
        if (note.hasKey && window.PianoApp.pressKeyVisual) {
          window.PianoApp.pressKeyVisual(note.note);
        }
        // Release visual after note duration
        const releaseTimer = setTimeout(() => {
          if (note.hasKey && window.PianoApp.releaseKeyVisual) {
            window.PianoApp.releaseKeyVisual(note.note);
          }
        }, note.duration);
        this.timeouts.push(releaseTimer);
      }, note.time);

      this.timeouts.push(visualTimer);
    });

    // Auto-reset after sequence ends
    if (seq.length > 0) {
      const last = seq[seq.length - 1];
      const endTimer = setTimeout(() => {
        this.isPlaying = false;
        this.timeouts = [];
      }, last.time + last.duration + 100);
      this.timeouts.push(endTimer);
    }
  },

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts = [];
    if (window.PianoApp.releaseAllKeysVisual) {
      window.PianoApp.releaseAllKeysVisual();
    }
  },

  toggle() {
    this.isPlaying ? this.stop() : this.start();
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add js/sequencer.js
git commit -m "feat: add sequencer for auto-playing Canon in D"
```

---

### Task 4: 修改钢琴 JS — 视觉函数 + 小猫事件

**Files:**
- Modify: `js/piano.js`

- [ ] **Step 1: 在 piano.js 末尾添加视觉函数**

在 `piano.js` 的 `initPiano` 函数内部（在 `container.addEventListener("contextmenu", ...)` 之后，`});` 之前），添加以下代码：

```javascript
      // ─── Auto-play Visual Helpers ──────────────────
      window.PianoApp.pressKeyVisual = function (note) {
        const group = svg.querySelector(`[data-note="${note}"]`);
        if (group && !isBlackKey(note)) group.classList.add("pressed");
        setVisualState(note, "pressed", true);
      };

      window.PianoApp.releaseKeyVisual = function (note) {
        const group = svg.querySelector(`[data-note="${note}"]`);
        if (group && !isBlackKey(note)) group.classList.remove("pressed");
        setVisualState(note, "pressed", false);
      };

      window.PianoApp.releaseAllKeysVisual = function () {
        whiteKeys.forEach((k) => window.PianoApp.releaseKeyVisual(k.note));
        blackKeys.forEach((k) => window.PianoApp.releaseKeyVisual(k.note));
      };

      // ─── Cat Click ─────────────────────────────────
      const ohCat = liveVisualSvg.getElementById("Oh Cat!");
      if (ohCat) {
        ohCat.style.cursor = "pointer";
        ohCat.style.pointerEvents = "auto";
        ohCat.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.PianoApp.Sequencer.toggle();
        });
      }
```

注意：这段代码要放在 `container.addEventListener("contextmenu", ...)` 之后，确保 `svg`、`isBlackKey`、`setVisualState`、`whiteKeys`、`blackKeys`、`liveVisualSvg` 等变量都在作用域内。

- [ ] **Step 2: Commit**

```bash
git add js/piano.js
git commit -m "feat: add piano key visual helpers and cat click handler"
```

---

### Task 5: 修改 index.html 引入序列器

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 在 script 标签中添加 sequencer.js**

找到这一行：
```html
<script src="js/piano.js?v=16"></script>
```

在其后添加：
```html
<script src="js/canon_data.js?v=1"></script>
<script src="js/sequencer.js?v=1"></script>
```

同时更新 audio.js 的 cache-busting 版本号（因为修改了）：
```html
<script src="js/audio.js?v=5"></script>
```

以及 piano.js 的版本号：
```html
<script src="js/piano.js?v=17"></script>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: include canon_data and sequencer scripts in index"
```

---

### Task 6: 端到端验证

**Files:** None (browser testing)

- [ ] **Step 1: 启动本地服务器并打开首页**

```bash
python3 -m http.server 8080
```

在浏览器中打开 `http://localhost:8080`

- [ ] **Step 2: 验证小猫可点击**

鼠标悬停在五线谱上的小猫区域，光标应变为 `pointer`。

- [ ] **Step 3: 验证自动播放**

点击小猫，应听到 Canon in D 开始演奏，同时可见琴键（F2–E4）同步下压。

- [ ] **Step 4: 验证中断**

播放过程中再次点击小猫，音乐应立即停止，所有琴键复位。

- [ ] **Step 5: 验证键盘交互不受影响**

自动播放期间，用鼠标点击琴键或用键盘按和弦键（c/d/e/f/g/a/b），应能正常播放，与自动播放并行。

- [ ] **Step 6: 验证导航键长按不受影响**

按住 C4/D4/E4 白键 3 秒，应仍能触发页面跳转。

- [ ] **Step 7: 提交最终验证**

```bash
git log --oneline -5
```

Expected: 看到 5 个提交，从最新到最旧：
1. `feat: include canon_data and sequencer scripts in index`
2. `feat: add piano key visual helpers and cat click handler`
3. `feat: add sequencer for auto-playing Canon in D`
4. `feat: add playNoteMidi for full-range MIDI playback`
5. `feat: add Canon in D mscz parser and generated note sequence`

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] mscz 解析 → Task 1
- [x] 全音域 MIDI 音频 → Task 2
- [x] 序列器调度 + 中断 → Task 3
- [x] 琴键视觉同步 → Task 4
- [x] 小猫点击事件 → Task 4
- [x] index.html 引入 → Task 5
- [x] 浏览器验证 → Task 6

**2. Placeholder scan:** 无 TBD/TODO/"implement later"

**3. Type consistency:**
- `playNoteMidi(midi, durationMs, when)` 签名一致
- `pressKeyVisual(note)` / `releaseKeyVisual(note)` 使用 note name string
- `Sequencer.toggle()` 入口一致

**4. 无 gaps:** 所有 spec 要求都有对应任务
