# ✨ Doodle Photobooth

A cute, sketchbook-style photobooth web app that runs entirely in the browser — no install, no build step, no backend.

Snap up to **4 selfies** with a live preview, a **3-second countdown**, and download your photos as a vertical **PNG strip**.

![Built with HTML, CSS, and JavaScript only](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS-blue)

## Features

- Live webcam preview (`getUserMedia`)
- 3-second countdown before each capture
- Vertical photostrip (up to 4 photos)
- Clear / retake and download strip as PNG
- Graceful camera permission error messages
- Mobile-friendly responsive layout
- Doodle / sketchbook UI theme
- **6 digicam filter themes** including viral Instagram-style **Flash**

## Quick Start (Local)

1. Clone or download this repository.
2. Open `index.html` in a modern browser **or** serve the folder with any static file server.

> **Note:** Camera access requires a **secure context** (HTTPS or `localhost`). Opening the file directly (`file://`) may block the camera in some browsers. Use a local server for testing:

```bash
# Python 3
python -m http.server 8080

# Node (if installed)
npx serve .
```

Then visit `http://localhost:8080`.

## Deploy to GitHub Pages

### Option A — From a repository root

1. Push these files to a GitHub repository:
   - `index.html`
   - `style.css`
   - `script.js`
   - `README.md`

2. On GitHub, go to **Settings → Pages**.

3. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or `master`) → `/ (root)` → **Save**

4. Wait ~1 minute. Your site will be live at:

   ```
   https://<your-username>.github.io/<repo-name>/
   ```

### Option B — From a `docs/` folder

1. Move the app files into a `docs/` folder in your repo.
2. In **Settings → Pages**, set the source to `main` → `/docs`.
3. Save and wait for deployment.

### Option C — User/organization site

For a repo named `<username>.github.io`, push to `main` and Pages will serve from the root automatically at:

```
https://<username>.github.io/
```

## Customization

Edit the constants at the top of `script.js`:

| Constant            | Default | Description                    |
|---------------------|---------|--------------------------------|
| `MAX_PHOTOS`        | `4`     | Photos per strip               |
| `COUNTDOWN_SECONDS` | `3`     | Seconds before capture         |
| `CAPTURE_WIDTH`     | `600`   | Output photo width (px)        |
| `CAPTURE_HEIGHT`    | `800`   | Output photo height (px)       |
| `DEFAULT_THEME`     | `"flash"` | Starting digicam theme id    |

### Digicam themes

Pick a vibe before your first snap — the theme locks once the strip starts (clear to change).

| Theme    | Id        | Look                                              |
|----------|-----------|---------------------------------------------------|
| Natural  | `natural` | Clean, unfiltered                                 |
| **Flash**| `flash`   | Viral digicam flash — harsh light, green shadow cast, lime-green date stamp, grain |
| Golden   | `golden`  | Warm sunset tones + date stamp                    |
| Cool     | `cool`    | Blue disposable-camera cast + date stamp          |
| B&W      | `mono`    | High-contrast black & white + grain               |
| Dreamy   | `dreamy`  | Soft pastel bloom + faded tones                   |

Add or tweak themes in the `THEMES` object at the top of `script.js`. Each theme has a live CSS preview and a canvas `apply()` function for the final capture.

Colors and fonts live in `:root` at the top of `style.css`.

Fonts are loaded from [Google Fonts](https://fonts.google.com/) (Caveat + Patrick Hand) — the only external dependency.

## Browser Support

Works in modern browsers that support:

- `navigator.mediaDevices.getUserMedia`
- `<canvas>` and `toDataURL`

Tested targets: Chrome, Firefox, Safari (iOS 11+), Edge.

## File Structure

```
.
├── index.html    # Page structure
├── style.css     # Doodle/sketchbook theme
├── script.js     # Camera, capture, strip, download
└── README.md     # This file
```

## License

MIT — use freely for personal or commercial projects.
