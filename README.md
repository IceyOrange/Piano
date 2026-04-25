# Piano — Personal Homepage

A piano-inspired personal portfolio built with pure HTML, CSS, and JavaScript. No build tools, no frameworks — open directly in your browser.

## Pages

- **Home** (`index.html`) — Interactive piano keyboard landing page with 14 white keys and 10 black keys spanning two octaves (F2–E4). Keys play synthesized audio via the Web Audio API. Long-press the labeled keys to navigate:
  - **Portfolio** (A2 key)
  - **Experience** (A3 key)
  - **About** (B3 key)
- **Portfolio** (`portfolio.html`) — Horizontal drag-scrolling project cards (desktop) or vertical card list (mobile). Click any card to open a detail modal.
- **Experience** (`experience.html`) — Animated SVG map with a drawn route line and city markers (desktop) or vertical card list (mobile). Click a city to see role details.
- **About** (`about.html`) — Avatar, bio, skill pills, and social links with staggered entrance animation.

## Local Preview

Since the site uses ES modules and the Web Audio API, open it via a local HTTP server:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

Alternatively, with Node.js:

```bash
npx serve .
```

## Architecture

| File | Purpose |
|------|---------|
| `index.html` | Home page with piano keyboard |
| `portfolio.html` | Portfolio page |
| `experience.html` | Experience page |
| `about.html` | About page |
| `css/styles.css` | All styles: tokens, reset, layout, components, animations |
| `js/data.js` | Projects, experiences, skills, social links |
| `js/audio.js` | Web Audio API synthesis (triangle oscillator + ADSR envelope) |
| `js/piano.js` | Piano keyboard rendering and interactions |
| `js/transitions.js` | Page exit overlays and link interception |
| `js/menu.js` | Fullscreen menu (clip-path circle animation) |
| `js/scroller.js` | Horizontal infinite scroll (drag / wheel / touch) |
| `js/portfolio.js` | Portfolio page: center detection, detail modal |
| `js/map.js` | Experience SVG map + route draw animation |
| `js/about.js` | About page: staggered entrance animations |

## Design

- **Colors**: Deep navy `#0A1929`, warm ivory `#F5F0E6`, accent warm `#D4A574`
- **Fonts**: Inter (sans-serif) + Playfair Display (serif) via Google Fonts
- **Responsive breakpoint**: 768px (mobile / desktop)
- **Accessibility**: `prefers-reduced-motion` support, semantic HTML, ARIA labels
