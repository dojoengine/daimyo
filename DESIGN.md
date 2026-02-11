# Daimyo UI Design System

Feudal Japanese cyberpunk aesthetic.
Dark mode with neon red accents, Japanese serif typography, and glow effects.

## Color Palette

CSS variables defined on `:root` in `client/src/pages/Home.css`.

### Backgrounds

| Variable | Hex | Usage |
|---|---|---|
| `--void` | `#0a0a0f` | Page background |
| `--ink` | `#141420` | Card/panel backgrounds |
| `--scroll` | `#1c1c2c` | Hover states, secondary surfaces |
| `--ash` | `#2a2a3a` | Borders, subtle dividers |

### Text

| Variable | Hex | Usage |
|---|---|---|
| `--parchment` | `#d4d4e0` | Primary text, headings |
| `--mist` | `#a4a4bc` | Secondary text, descriptions |
| `--stone` | `#787892` | Tertiary text, metadata, labels |

### Accents

| Variable | Hex | Usage |
|---|---|---|
| `--neon-red` | `#ff1a3d` | Primary action, buttons, links |
| `--neon-glow` | `#ff1a3d40` | Glow/shadow effects (40% opacity) |
| `--ember` | `#ff4d2a` | Reserved secondary accent |
| `--gold` | `#c9a84c` | Premium accent, section titles |
| `--gold-dim` | `#c9a84c30` | Gold borders (30% opacity) |

### External Brand Colors

- Discord: `#5865f2` (used only for Discord login button)

## Typography

### Font Stack

Loaded via Google Fonts in `client/index.html`.

| Font | Weights | Usage |
|---|---|---|
| `Noto Serif` | 400, 700, 900 | Headings, titles (Latin characters) |
| `Noto Serif JP` | 400, 700, 900 | Headings (Japanese characters, fallback) |
| `DM Sans` | 400, 500, 600 | Body text (set on `body`) |

### Title Pattern

Large serif headings use a gold shimmer gradient:

```css
font-family: 'Noto Serif', 'Noto Serif JP', serif;
background: linear-gradient(135deg, var(--parchment) 0%, var(--gold) 50%, var(--parchment) 100%);
background-size: 200% 200%;
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

### Size Scale

- Hero title: 64px (44px mobile)
- Page title: 28-36px
- Section title: 20px
- Body: 15-16px
- Small: 14px
- Label: 11px

## Components

### Buttons

**Primary** (call-to-action):
```css
background: var(--neon-red);
color: #fff;
border: none;
border-radius: 4px;
box-shadow: 0 0 20px var(--neon-glow);
```

**Secondary** (outlined):
```css
background: transparent;
color: var(--parchment);
border: 1px solid var(--ash);
border-radius: 4px;
```

**Link-style** (bottom nav):
```css
border: 1px solid var(--neon-red);
color: #fff;
background: transparent;
/* hover: fills with neon-red */
```

### Cards

```css
background: var(--ink);
border: 1px solid var(--ash);
border-radius: 12px;
/* hover: background changes to var(--scroll) */
```

### Progress Bar

- Track: `var(--ash)` background
- Fill: `var(--neon-red)` with `box-shadow: 0 0 8px var(--neon-glow)`

## Animations

Defined in `Home.css`:

| Name | Duration | Description |
|---|---|---|
| `fadeIn` | 0.8s ease-out | Opacity 0 to 1 |
| `fadeUp` | 0.8s ease-out | Opacity + translateY(24px) to 0 |
| `shimmer` | 6s ease-in-out infinite | Background-position cycle for text gradient |
| `logoGlow` | 4s ease-in-out infinite alternate | Box-shadow pulse |

Standard transition: `all 0.25s ease`.

## Layout

- Max container width: 940px (home), 1200px (judge)
- Page padding: 40-80px vertical, 32px horizontal
- Mobile breakpoint: 768px
- Card gap: 2px (tight grid) or 20px (loose)
- Section spacing: 100px between major sections

## Decorative Elements

- **Ink wash background**: Multiple low-opacity radial gradients (purple, blue, red tints) on `::before` pseudo-element
- **Kanji watermarks**: Large characters at ~6-8% opacity using `Noto Serif JP` at 900 weight
  - `大名` (daimyo) on page right edge, vertical writing mode
  - `闘` (battle) in game jam section
- **Neon dividers**: `linear-gradient(90deg, transparent, var(--neon-red), transparent)` with glow
