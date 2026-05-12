---
title: Playback UX Improvements
date: 2026-05-12
status: approved
---

## Overview

Three improvements to the community recording playback experience on the index page: share feedback, cursor visibility, and visual richness.

## 1. Share Success Toast

**File**: `js/cat-menu.js`

After successful recording submission, show a bottom-floating toast notification:
- Semi-transparent green bar at page bottom
- Text: `已分享到社区 ✓` + recording title
- Auto-dismiss after 2 seconds with fade-out transition
- Add a `showToast(message)` helper to `window.PianoApp` for reuse
- Call it from the submit success handler in cat-menu.js

CSS:
- `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%)`
- Background: `rgba(34,197,94,0.15)` with `border: 1px solid rgba(34,197,94,0.3)`
- `backdrop-filter: blur(8px)`, border-radius: 10px
- Entry: slideUp + fadeIn, exit: fadeOut over 0.3s

## 2. Cursor Visibility During Community Playback

**Files**: `js/piano.js`, `css/styles.css`

**Root cause**: vinyl cursor `z-index: 1000` is behind community overlay `z-index: 1003`. Additionally, `cursor: none !important` hides the system cursor entirely during community playback.

Fixes:
- Raise vinyl cursor z-index from 1000 → 1010
- When `playingCommunity` is true, do NOT apply `cursor: none`. Only hide system cursor for `catHover` and `playingCanon`. The vinyl cursor follows the mouse but system cursor remains visible.

## 3. Enhanced Playback Visuals

**File**: `js/falling-notes.js`, `js/community.js`, `css/styles.css`

### 3a. Fix: Falling notes invisible behind community overlay

- Raise falling notes canvas z-index from 11 → 1005 (above community overlay at 1003, below now-playing-bar at z-index level)
- Canvas renders ON TOP of the community overlay

### 3b. Enhanced note bars

Increase visibility of falling note bars:
- Glow layer opacity: 0.15 → 0.25
- Solid bar opacity: 0.6/0.65 → 0.85
- Add `ctx.shadowBlur = 12` and `ctx.shadowColor` matching note color for a soft bloom effect
- White keys: warm amber `rgba(255,195,115,0.85)`, glow `rgba(255,190,100,0.4)`
- Black keys: cool blue `rgba(130,200,255,0.85)`, glow `rgba(100,180,255,0.4)`

### 3c. Aurora background

Before drawing note bars, render 2-3 soft colored blobs on the canvas:
- Use `ctx.filter = 'blur(40px)'` or manual radial gradients
- Colors shift subtly: warm blobs when white-key notes are active, cool blobs for black-key notes
- Keep opacity low (0.06–0.10) to stay atmospheric, not distracting
- Blobs drift slowly (position offset by sin/cos of elapsed time)

### 3d. Center vinyl + track info

Draw on the falling notes canvas (no extra DOM):
- Small vinyl disc (56px) at screen center, rotating via canvas transform
- Track name below in warm ivory, font-size 14px, semi-bold
- Artist name below that in muted ivory (0.35 opacity), font-size 11px
- Pass `{ title, artist }` to `FallingNotes.start(rec, { title, artist })` from community.js
- All drawn at ~0.7 opacity to not obstruct falling notes

## Files Changed

| File | Change |
|------|--------|
| `js/cat-menu.js` | Call toast on submit success |
| `js/piano.js` | Split cursor-none logic; don't hide cursor for community |
| `js/falling-notes.js` | Enhanced draw: aurora bg, glow bars, vinyl disc, track info; z-index fix |
| `js/community.js` | Pass track info to FallingNotes.start() |
| `css/styles.css` | Toast styles; cursor z-index; falling notes z-index |
