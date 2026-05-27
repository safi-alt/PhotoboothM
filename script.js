/**
 * Doodle Photobooth
 * Pure vanilla JS — no build step, works on GitHub Pages.
 *
 * Customize MAX_PHOTOS, COUNTDOWN_SECONDS, or capture dimensions below.
 * Add or edit digicam themes in the THEMES object.
 */

// ---- Configuration (easy to tweak) ----
const MAX_PHOTOS = 4;
const COUNTDOWN_SECONDS = 3;
const CAPTURE_WIDTH = 600;   // output photo width in px
const CAPTURE_HEIGHT = 800;  // output photo height in px (3:4 ratio)
const DEFAULT_THEME = "flash";

/** Text printed on the photostrip preview and downloaded PNG */
const STRIP_MESSAGE = {
  main: "Eid Mubarak",
  sub: "to my lovely wife",
};

// ---- DOM references ----
const video = document.getElementById("video");
const previewCanvas = document.getElementById("preview-canvas");
const captureCanvas = document.getElementById("capture-canvas");
const stripCanvas = document.getElementById("strip-canvas");
const countdownEl = document.getElementById("countdown");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const cameraErrorEl = document.getElementById("camera-error");
const photoCountEl = document.getElementById("photo-count");
const stripEl = document.getElementById("strip");
const cameraFrame = document.getElementById("camera-frame");
const previewVignette = document.getElementById("preview-vignette");
const themePickerEl = document.getElementById("theme-picker");
const themeOptionsEl = document.getElementById("theme-options");

const btnCapture = document.getElementById("btn-capture");
const btnClear = document.getElementById("btn-clear");
const btnDownload = document.getElementById("btn-download");

// ---- State ----
/** @type {string[]} Data URLs of captured photos */
let photos = [];
let stream = null;
let isCapturing = false;
/** @type {string} Currently selected theme id */
let selectedTheme = DEFAULT_THEME;
/** Preview animation frame id */
let previewFrameId = null;

// ==========================================================================
// DIGICAM THEMES
// Each theme has: name, icon, preview settings, and an apply() for capture.
// ==========================================================================

const THEMES = {
  natural: {
    name: "Natural",
    icon: "🌿",
    preview: { filter: "natural", vignette: 0 },
    apply(ctx, w, h) {
      // No processing — clean webcam capture
    },
  },

  /**
   * Viral Instagram "digicam flash" aesthetic:
   * harsh on-camera flash, crushed shadows, lime-green date stamp, grain.
   */
  flash: {
    name: "Flash",
    icon: "⚡",
    preview: { filter: "flash", vignette: 0.85, tint: "green" },
    apply(ctx, w, h) {
      applyPixelGrade(ctx, w, h, (r, g, b) => {
        const lum = luminance(r, g, b);

        // High contrast + punchy saturation (flash-lit subject)
        let nr = contrast(r, 1.4);
        let ng = contrast(g, 1.42);
        let nb = contrast(b, 1.32);
        nr = clamp(nr * 1.05);
        ng = clamp(ng * 1.08);
        nb = clamp(nb * 0.98);

        // Crush shadows hard — background falls to black like direct flash
        if (lum < 95) {
          const crush = 0.35 + (lum / 95) * 0.45;
          nr *= crush;
          ng *= crush;
          nb *= crush;
        }

        // Blow highlights slightly on skin-tones / bright areas
        if (lum > 180) {
          nr = clamp(nr * 1.08 + 12);
          ng = clamp(ng * 1.06 + 10);
          nb = clamp(nb * 1.02 + 4);
        }

        // Signature green accent in shadows & midtones (Insta digicam look)
        if (lum < 140) {
          const greenMix = 1 - lum / 140; // stronger in darker areas
          nr = clamp(nr * (1 - greenMix * 0.12) + greenMix * 4);
          ng = clamp(ng * (1 + greenMix * 0.14) + greenMix * 18);
          nb = clamp(nb * (1 - greenMix * 0.1) + greenMix * 6);
        } else {
          nr = clamp(nr * 1.02 + 2);
          ng = clamp(ng * 1.03 + 3);
        }

        return [nr, ng, nb];
      });

      addVignette(ctx, w, h, 0.72, "green");
      addGrain(ctx, w, h, 22);
      drawDateStamp(ctx, w, h, {
        color: "#00ff66",
        shadow: "rgba(0, 30, 10, 0.75)",
        format: "digicam",
      });
    },
  },

  golden: {
    name: "Golden",
    icon: "☀️",
    preview: { filter: "golden", vignette: 0.45 },
    apply(ctx, w, h) {
      applyPixelGrade(ctx, w, h, (r, g, b) => {
        let nr = r * 1.08 + 18;
        let ng = g * 1.04 + 10;
        let nb = b * 0.88;
        nr = contrast(nr, 1.12);
        ng = contrast(ng, 1.1);
        nb = contrast(nb, 1.08);
        return [clamp(nr), clamp(ng), clamp(nb)];
      });
      addVignette(ctx, w, h, 0.35);
      addGrain(ctx, w, h, 14);
      drawDateStamp(ctx, w, h, {
        color: "#cc8800",
        shadow: "rgba(80,40,0,0.5)",
        format: "classic",
      });
    },
  },

  cool: {
    name: "Cool",
    icon: "❄️",
    preview: { filter: "cool", vignette: 0.5 },
    apply(ctx, w, h) {
      applyPixelGrade(ctx, w, h, (r, g, b) => {
        let nr = r * 0.92;
        let ng = g * 1.02 + 4;
        let nb = b * 1.12 + 14;
        nr = contrast(nr, 1.15);
        ng = contrast(ng, 1.15);
        nb = contrast(nb, 1.18);
        return [clamp(nr), clamp(ng), clamp(nb)];
      });
      addVignette(ctx, w, h, 0.4);
      addGrain(ctx, w, h, 16);
      drawDateStamp(ctx, w, h, {
        color: "#44ccff",
        shadow: "rgba(0,30,60,0.55)",
        format: "digicam",
      });
    },
  },

  mono: {
    name: "B&W",
    icon: "🖤",
    preview: { filter: "mono", vignette: 0.55 },
    apply(ctx, w, h) {
      applyPixelGrade(ctx, w, h, (r, g, b) => {
        let gray = luminance(r, g, b);
        gray = contrast(gray, 1.35);
        gray = clamp(gray * 1.04);
        return [gray, gray, gray];
      });
      addVignette(ctx, w, h, 0.5);
      addGrain(ctx, w, h, 28);
    },
  },

  dreamy: {
    name: "Dreamy",
    icon: "✨",
    preview: { filter: "dreamy", vignette: 0.25 },
    apply(ctx, w, h) {
      // Soft bloom: draw a blurred copy underneath
      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = w;
      blurCanvas.height = h;
      const bctx = blurCanvas.getContext("2d");
      bctx.filter = "blur(6px) brightness(1.15)";
      bctx.drawImage(captureCanvas, 0, 0);
      ctx.globalAlpha = 0.35;
      ctx.drawImage(blurCanvas, 0, 0);
      ctx.globalAlpha = 1;

      applyPixelGrade(ctx, w, h, (r, g, b) => {
        let nr = r * 0.95 + 15;
        let ng = g * 0.93 + 12;
        let nb = b * 1.02 + 18;
        nr = contrast(nr, 0.92);
        ng = contrast(ng, 0.9);
        nb = contrast(nb, 0.9);
        return [clamp(nr), clamp(ng), clamp(nb)];
      });
      addVignette(ctx, w, h, 0.2);
      addGrain(ctx, w, h, 8);
    },
  },
};

// ---- Filter helpers ----

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function contrast(value, amount) {
  return clamp(((value / 255 - 0.5) * amount + 0.5) * 255);
}

/**
 * Run a per-pixel RGB transform across the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {(r: number, g: number, b: number) => [number, number, number]} fn
 */
function applyPixelGrade(ctx, w, h, fn) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = fn(d[i], d[i + 1], d[i + 2]);
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Darken edges for that direct-flash falloff look.
 * @param {"neutral"|"green"} tint — green adds the Insta digicam shadow cast
 */
function addVignette(ctx, w, h, strength, tint = "neutral") {
  const gradient = ctx.createRadialGradient(
    w / 2, h / 2, w * 0.2,
    w / 2, h / 2, w * 0.85
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(
    1,
    tint === "green"
      ? `rgba(0, 28, 12, ${strength})`
      : `rgba(0, 0, 0, ${strength})`
  );

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Add digicam-style sensor noise.
 */
function addGrain(ctx, w, h, amount) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount;
    d[i] = clamp(d[i] + noise);
    d[i + 1] = clamp(d[i + 1] + noise);
    d[i + 2] = clamp(d[i + 2] + noise);
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw a retro date stamp (classic digicam overlay).
 */
function drawDateStamp(ctx, w, h, opts) {
  const now = new Date();
  let text;

  if (opts.format === "digicam") {
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    text = `'${yy} ${mm} ${dd}`;
  } else {
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    text = `${months[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`;
  }

  const fontSize = Math.round(w * 0.045);
  const padX = w * 0.04;
  const padY = h * 0.04;

  ctx.font = `${fontSize}px "Share Tech Mono", monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  ctx.shadowColor = opts.shadow;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = opts.color;
  ctx.fillText(text, w - padX, h - padY);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
}

// ---- Theme picker UI ----

function buildThemePicker() {
  themeOptionsEl.innerHTML = "";

  Object.entries(THEMES).forEach(([id, theme]) => {
    const label = document.createElement("label");
    label.className = "theme-option";
    label.dataset.theme = id;

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "digicam-theme";
    input.value = id;
    input.checked = id === selectedTheme;

    const chip = document.createElement("span");
    chip.className = "theme-chip";
    chip.innerHTML =
      `<span class="theme-chip-icon">${theme.icon}</span>` +
      `<span class="theme-chip-name">${theme.name}</span>`;

    input.addEventListener("change", () => {
      if (input.checked) setTheme(id);
    });

    label.appendChild(input);
    label.appendChild(chip);
    themeOptionsEl.appendChild(label);
  });
}

function setTheme(id) {
  if (!THEMES[id]) return;
  selectedTheme = id;

  const theme = THEMES[id];

  // Update live preview filter on canvas
  previewCanvas.className = "";
  previewCanvas.classList.add(`filter-${theme.preview.filter}`);

  // Vignette strength for preview
  if (theme.preview.vignette > 0) {
    previewVignette.classList.add("active");
    previewVignette.style.opacity = String(Math.min(theme.preview.vignette, 1));

    // Green-tinted vignette for Insta Flash preview
    if (theme.preview.tint === "green") {
      previewVignette.style.background =
        "radial-gradient(ellipse at center, transparent 35%, rgba(0, 36, 16, 0.7) 100%)";
    } else {
      previewVignette.style.background =
        "radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.55) 100%)";
    }
  } else {
    previewVignette.classList.remove("active");
    previewVignette.style.opacity = "0";
  }

  cameraFrame.className = `camera-frame theme-${id}`;
}

function setThemePickerEnabled(enabled) {
  themePickerEl.classList.toggle("disabled", !enabled);
  themePickerEl.querySelectorAll("input").forEach((input) => {
    input.disabled = !enabled;
  });
}

// ---- Video drawing (shared by preview + capture for WYSIWYG) ----

/**
 * Draw the current video frame to a canvas.
 * Preview and capture use this same function so they always match.
 * Horizontally flipped by default for a natural selfie-style view.
 */
function drawVideoToCanvas(ctx, width, height) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
}

function startPreviewLoop() {
  stopPreviewLoop();

  const tick = () => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const rect = previewCanvas.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);

      if (w > 0 && h > 0) {
        if (previewCanvas.width !== w || previewCanvas.height !== h) {
          previewCanvas.width = w;
          previewCanvas.height = h;
        }

        const ctx = previewCanvas.getContext("2d");
        drawVideoToCanvas(ctx, w, h);
      }
    }

    previewFrameId = requestAnimationFrame(tick);
  };

  previewFrameId = requestAnimationFrame(tick);
}

function stopPreviewLoop() {
  if (previewFrameId !== null) {
    cancelAnimationFrame(previewFrameId);
    previewFrameId = null;
  }
}

// ---- Camera ----

async function startCamera() {
  hideError();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showError(
      "Your browser doesn't support camera access. Try Chrome, Firefox, or Safari on a secure (HTTPS) connection."
    );
    cameraPlaceholder.querySelector("p").textContent = "Camera not supported";
    btnCapture.disabled = true;
    return;
  }

  try {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const videoConstraints = isMobile
      ? {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        }
      : {
          width: { ideal: 1280 },
          height: { ideal: 960 },
        };

    stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });

    video.srcObject = stream;
    await video.play();

    startPreviewLoop();

    cameraPlaceholder.classList.add("hidden");
    btnCapture.disabled = isStripFull();
  } catch (err) {
    handleCameraError(err);
  }
}

function handleCameraError(err) {
  cameraPlaceholder.querySelector("p").textContent = "Camera unavailable";

  const messages = {
    NotAllowedError:
      "Camera permission was denied. Please allow camera access in your browser settings and refresh the page.",
    NotFoundError:
      "No camera was found on this device. Plug in a webcam or use a device with a built-in camera.",
    NotReadableError:
      "The camera is already in use by another app. Close other apps using the camera and try again.",
    OverconstrainedError:
      "Couldn't find a camera matching the requested settings. Try a different device.",
    SecurityError:
      "Camera access requires a secure connection (HTTPS). GitHub Pages provides this automatically.",
  };

  const message =
    messages[err.name] ||
    `Could not access the camera: ${err.message || "Unknown error"}. Please refresh and try again.`;

  showError(message);
  btnCapture.disabled = true;
}

function showError(message) {
  cameraErrorEl.textContent = message;
  cameraErrorEl.hidden = false;
}

function hideError() {
  cameraErrorEl.hidden = true;
  cameraErrorEl.textContent = "";
}

function stopCamera() {
  stopPreviewLoop();
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

// ---- Capture flow ----

async function capturePhoto() {
  if (isCapturing || isStripFull() || !stream) return;

  isCapturing = true;
  btnCapture.disabled = true;
  setThemePickerEnabled(false);

  for (let i = COUNTDOWN_SECONDS; i >= 1; i--) {
    await showCountdown(i);
  }

  hideCountdown();
  await flashAndCapture();

  isCapturing = false;
  updateUI();
}

function showCountdown(num) {
  return new Promise((resolve) => {
    countdownEl.textContent = String(num);
    countdownEl.hidden = false;
    countdownEl.style.animation = "none";
    countdownEl.offsetHeight;
    countdownEl.style.animation = "";

    setTimeout(resolve, 900);
  });
}

function hideCountdown() {
  countdownEl.hidden = true;
  countdownEl.textContent = "";
}

async function flashAndCapture() {
  const isFlashTheme = selectedTheme === "flash";
  cameraFrame.classList.add("flash");
  if (isFlashTheme) cameraFrame.classList.add("flash-burst");
  setTimeout(() => {
    cameraFrame.classList.remove("flash", "flash-burst");
  }, isFlashTheme ? 450 : 300);

  const ctx = captureCanvas.getContext("2d");
  captureCanvas.width = CAPTURE_WIDTH;
  captureCanvas.height = CAPTURE_HEIGHT;

  drawVideoToCanvas(ctx, CAPTURE_WIDTH, CAPTURE_HEIGHT);

  // Apply selected digicam theme
  const theme = THEMES[selectedTheme];
  if (theme && theme.apply) {
    theme.apply(ctx, CAPTURE_WIDTH, CAPTURE_HEIGHT);
  }

  const dataUrl = captureCanvas.toDataURL("image/png");
  photos.push(dataUrl);

  renderStripSlot(photos.length - 1, dataUrl);
}

// ---- Photostrip UI ----

function renderStripSlot(index, dataUrl) {
  const slot = stripEl.querySelector(`[data-slot="${index}"]`);
  if (!slot) return;

  slot.classList.add("filled");
  slot.classList.remove("next-slot");

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = `Photo ${index + 1}`;
  slot.appendChild(img);

  const next = stripEl.querySelector(".strip-slot:not(.filled)");
  if (next) next.classList.add("next-slot");
}

function clearPhotos() {
  photos = [];
  isCapturing = false;
  hideCountdown();

  stripEl.querySelectorAll(".strip-slot").forEach((slot, i) => {
    slot.classList.remove("filled", "next-slot");
    const img = slot.querySelector("img");
    if (img) img.remove();
    if (!slot.querySelector(".slot-label")) {
      const label = document.createElement("span");
      label.className = "slot-label";
      label.textContent = String(i + 1);
      slot.appendChild(label);
    }
  });

  const first = stripEl.querySelector(".strip-slot");
  if (first) first.classList.add("next-slot");

  updateUI();
}

function isStripFull() {
  return photos.length >= MAX_PHOTOS;
}

function updateUI() {
  const count = photos.length;
  photoCountEl.textContent =
    count >= MAX_PHOTOS
      ? "All 4 photos captured! 🎉"
      : `Photo ${count + 1} of ${MAX_PHOTOS}`;

  btnCapture.disabled = isCapturing || isStripFull() || !stream;
  btnClear.disabled = count === 0;
  btnDownload.disabled = count === 0;

  // Lock theme once strip has started (keeps all 4 photos consistent)
  setThemePickerEnabled(count === 0 && !isCapturing);
}

// ---- Download strip as PNG ----

function downloadStrip() {
  if (photos.length === 0) return;

  const padding = 24;
  const gap = 12;
  const border = 6;
  const captionHeight = 100;
  const photoW = CAPTURE_WIDTH;
  const photoH = CAPTURE_HEIGHT;
  const stripW = photoW + padding * 2 + border * 2;
  const stripH =
    padding * 2 +
    border * 2 +
    captionHeight +
    gap +
    photos.length * photoH +
    (photos.length - 1) * gap;

  stripCanvas.width = stripW;
  stripCanvas.height = stripH;

  const ctx = stripCanvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, stripW, stripH);

  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = border;
  ctx.strokeRect(border / 2, border / 2, stripW - border, stripH - border);

  drawStripCaption(ctx, stripW, padding + border, captionHeight);

  let y = padding + border + captionHeight + gap;

  const drawNext = (index) => {
    if (index >= photos.length) {
      triggerDownload(stripCanvas.toDataURL("image/png"));
      return;
    }

    const img = new Image();
    img.onload = () => {
      const x = padding + border;
      ctx.drawImage(img, x, y, photoW, photoH);

      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, photoW, photoH);

      y += photoH + gap;
      drawNext(index + 1);
    };
    img.onerror = () => {
      console.error(`Failed to load photo ${index + 1} for download.`);
      drawNext(index + 1);
    };
    img.src = photos[index];
  };

  drawNext(0);
}

/**
 * Draw the Eid Mubarak caption onto the downloadable strip canvas.
 */
function drawStripCaption(ctx, stripW, x, height) {
  const centerX = stripW / 2;
  const mainY = x + height * 0.42;
  const subY = x + height * 0.78;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = '700 42px "Caveat", cursive';
  ctx.fillStyle = "#ff6b9d";
  ctx.fillText(STRIP_MESSAGE.main, centerX, mainY);

  ctx.font = '500 28px "Caveat", cursive';
  ctx.fillStyle = "#1a1a1a";
  ctx.fillText(STRIP_MESSAGE.sub, centerX, subY);

  // Small decorative hearts
  ctx.font = '500 22px "Caveat", cursive';
  ctx.fillStyle = "#ffd93d";
  ctx.fillText("♥", centerX - 120, mainY);
  ctx.fillText("♥", centerX + 120, mainY);
}

function triggerDownload(dataUrl) {
  const themeName = THEMES[selectedTheme]?.name?.toLowerCase() || "strip";
  const link = document.createElement("a");
  link.download = `doodle-photobooth-${themeName}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

// ---- Event listeners ----

btnCapture.addEventListener("click", capturePhoto);
btnClear.addEventListener("click", clearPhotos);
btnDownload.addEventListener("click", downloadStrip);
window.addEventListener("beforeunload", stopCamera);

// ---- Init ----
(function init() {
  buildThemePicker();
  setTheme(selectedTheme);

  const firstSlot = stripEl.querySelector(".strip-slot");
  if (firstSlot) firstSlot.classList.add("next-slot");

  updateUI();
  startCamera();
})();
