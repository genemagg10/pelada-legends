# Pelada Legends

3v3 rooftop street soccer in the browser. Pick a legend, charge **Ginga**, and fire a special on a night court.

Live: https://genemagg10.github.io/pelada-legends/

The modular tree under `src/` is the single source of truth. `index.html` is a thin Vite entry — there is no inlined CDN game.

## Run locally

```bash
npm i
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

Production builds set `base: '/pelada-legends/'` so asset URLs resolve on GitHub project pages. `npm run dev` still serves from `/`.

## Deploy (GitHub Pages)

`.github/workflows/deploy-pages.yml` builds `dist` and publishes it with the official Pages actions.

In the repo: **Settings → Pages → Source → GitHub Actions**.

Push to `main` (or run the workflow manually) to publish.

## Play notes

**YOU** wear gold / yellow. **RIVAL** wear red. Capsule silhouettes + jersey stripe/number. Your player has a gold ring and a `YOU` tag.

Shoots squash-stretch the ball, leave a short trail, stamp a ground disc, and punch FOV for 80–120ms. The carrier gets a soft team-colored ground ring; the ball tints to that team. Specials fire a colored burst + shockwave and a 1–2 frame freeze/desat.

### Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move (camera-relative) |
| Space | Shoot |
| E | Pass to a teammate |
| Shift | Special move (needs a full Ginga bar) |

### Ginga

Ginga fills over time, faster while you have the ball. At 100, Shift spends it on your legend's special (`specialName` / `specialDesc` on each card).

| Legend | Special |
| --- | --- |
| Pelé | King's Touch |
| Ronaldinho | Elastico |
| Ronaldo R9 | Unstoppable Force |
| R. Carlos | Banana Bolt |
| Neymar | Rainbow Flick |
| Messi | Magnet Touch |
| C. Ronaldo | Power Header |

Match length is 5:00. Home attacks the gold-net end; rivals attack the red-net end.

## Next

- Audio suite
- Mobile touch controls
- Pause menu
- Online multiplayer
