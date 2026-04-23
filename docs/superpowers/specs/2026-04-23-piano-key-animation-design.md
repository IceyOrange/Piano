# Piano Key Press Animation Design

## Overview
Add a subtle vertical displacement animation to white piano keys when pressed, creating a tactile "key depression" feedback for both mouse/touch and keyboard chord interactions. Black keys receive no visual feedback on press.

## Context
The project uses a two-layer SVG architecture for the piano keyboard:
- **Visual layer**: Figma-exported SVG with individual white key elements mapped via `keyIdMap`
- **Interaction layer**: Transparent hit-area rectangles for pointer and keyboard events

Current press feedback is minimal: white keys dim via `filter: brightness(0.9)`, black keys change interaction layer fill color. The user wants more expressive but still clean UI-style animation.

## Design Decisions

### White Key Animation
- **Trigger**: `pointerdown` (mouse/touch) or keyboard chord playback
- **Effect**: `transform: translateY(3px)` + `filter: brightness(0.9)`
- **Duration**: `0.12s`
- **Easing**: `ease-out`
- **Release**: Transform and filter revert on `pointerup` / `pointerleave` / `keyup`

### Black Key Animation
- **None**. No transform, no filter, no fill color change.
- Rationale: Black keys lack individually addressable SVG paths in the Figma export. Their irregular contours and existing drop shadows make any crude feedback (e.g., interaction layer rectangle tint) look worse than no feedback.

### Hover State
- White keys: `filter: brightness(0.96)` only — no displacement
- Black keys: No hover effect

### Navigation Keys (C4, D4, E4)
- These are white keys and follow the same animation rules
- During the 3-second long-press interval, the `.pressed` state (and thus the displacement) is held
- Key returns to rest position on release or page transition

### Keyboard Chords
- When chord keys are played via keyboard (`c/d/e/f/g/a/b`), all white keys in the chord animate simultaneously
- Black keys in the chord remain visually static

## Technical Details

### CSS Changes
Extend `.piano-key-visual` transition to include transform:
```css
.piano-key-visual {
  transition: filter 0.12s ease-out, transform 0.12s ease-out;
}
```

Add transform to pressed state:
```css
.piano-key-visual.pressed {
  filter: brightness(0.9);
  transform: translateY(3px);
}
```

Remove black key interaction layer fill:
```css
/* DELETE this rule entirely */
.piano-key-group[data-key-type="black"].pressed rect {
  fill: rgba(26, 26, 26, 0.55) !important;
}
```

### JS Changes
No changes required to the animation trigger logic. The existing `pressed` class toggle mechanism already covers:
- `handleDown` / `handleUp` for pointer events
- `playChordNotes` / `releaseChordNotes` for keyboard chords
- `handleLeave` for pointer cancellation

Optionally clean up black key class toggling in `handleDown`, `handleUp`, `handleLeave`, `playChordNotes`, and `releaseChordNotes` to avoid adding `pressed` to black key groups (since no CSS targets it, this is a no-op, but removing it keeps the code honest).

### File Scope
- `css/styles.css`: Update `.piano-key-visual` rules, remove black key fill rule
- `js/piano.js`: Optionally skip `pressed` class for black keys

## Success Criteria
1. White keys visibly depress (3px down) when clicked or played via keyboard
2. Black keys show absolutely no visual change on press
3. Chord playback animates all affected white keys simultaneously
4. Nav keys hold depressed state during 3-second long press
5. Animation feels snappy (0.12s) and does not drop frames during multi-key chords
6. Existing brightness hover/press feedback on white keys remains intact
