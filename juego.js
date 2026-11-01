/**
 * Flappy DeGregoriano
 * Canvas 640x360. Tres vidas, 5 puntos por pareja de tuberías,
 * objetivo 100 puntos. Sin dependencias externas.
 */
(() => {
  'use strict';

  const W = 640, H = 360;
  const GROUND_H = 34;
  const GROUND_Y = H - GROUND_H;
  const PLAYER_X = 142;
  const PLAYER_W = 48, PLAYER_H = 62;
  const HITBOX = { x: 9, y: 8, w: 30, h: 44 };
  const GAP = 170;
  const PIPE_W = 62;
  const PIPE_SPEED = 2.25;
  const GRAVITY = 0.22;
  const FLAP = -4.65;
  const TARGET = 100;
  const LIVES_MAX = 3;
  const RECORD_KEY = 'viale_flappy_de_gregoris_record';
  const BG_H = 170;      // alto con el que se dibuja fondocontinuo.png
  const PIPE_CAP = 0.3;  // fracción superior de tuberia.png que corresponde a la tapa
  const FONT = '"Press Start 2P", monospace';

  const canvas = document.getElementById('juego-canvas');
  const dialog = document.getElementById('dlg-juego');
  const trigger = document.getElementById('autor-trigger');
  if (!canvas || !dialog || !trigger) return;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const scoreEl = document.getElementById('juego-marcador');
  const recordEl = document.getElementById('juego-record');
  const livesEl = document.getElementById('juego-vidas');

  // ---------- Utilidades ----------
  const wrap = (v, m) => ((v % m) + m) % m;

  function rect(x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // ---------- Recursos (PNG en assets/juego/) ----------
  const ASSET_DIR = 'assets/juego/';
  const loadImg = (name) => {
    const img = new Image();
    img.src = ASSET_DIR + name;
    return img;
  };
  const IMG = {
    fondo: loadImg('fondocontinuo.png'),
    nubeG: loadImg('nube-grande.png'),
    nubeP: loadImg('nube-pequena.png'),
    idle: loadImg('personaje-idle.png'),
    salto: loadImg('personaje-salto.png'),
    tuberia: loadImg('tuberia.png'),
    suelo: loadImg('suelo.png')
  };
  const ok = (img) => img.complete && img.naturalWidth > 0;

  // ---------- Texto estilo 16 bits ----------
  function setFont(size) {
    ctx.font = `${size}px ${FONT}`;
  }
  function measure(str, size) {
    setFont(size);
    return ctx.measureText(str).width;
  }
  function wrapText(str, maxW, size) {
    const lines = [];
    let line = '';
    for (const word of str.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (measure(test, size) > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  // Texto con sombra y contorno oscuro opcionales.
  function text(str, x, y, size, opts = {}) {
    const { color = '#ffffff', outline = true, shadow = true, align = 'left' } = opts;
    setFont(size);
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;
    if (shadow) {
      ctx.fillStyle = 'rgba(4, 10, 20, .55)';
      ctx.fillText(str, x + 3, y + 3);
    }
    if (outline) {
      ctx.strokeStyle = '#0a1420';
      ctx.lineWidth = Math.max(3, size / 4);
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  // ---------- Escenario ----------
  // Nubes: se mueven a velocidades distintas (parallax suave).
  const CLOUDS = [
    { img: 'nubeG', x: 40,  y: 44,  speed: 0.12, w: 110 },
    { img: 'nubeP', x: 330, y: 110, speed: 0.09, w: 64 },
    { img: 'nubeG', x: 560, y: 26,  speed: 0.10, w: 84 },
    { img: 'nubeP', x: 200, y: 150, speed: 0.07, w: 56 }
  ];

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#2d86e0');
    sky.addColorStop(1, '#8fcdf3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    for (const c of CLOUDS) {
      const x = wrap(c.x - worldOffset * c.speed, W + c.w) - c.w;
      const img = IMG[c.img];
      if (ok(img)) {
        const h = Math.round(c.w * img.naturalHeight / img.naturalWidth);
        ctx.drawImage(img, Math.round(x), c.y, c.w, h);
      }
    }

    // Campus: se repite en horizontal a velocidad de fondo lejano.
    if (ok(IMG.fondo)) {
      const s = BG_H / IMG.fondo.naturalHeight;
      const dw = IMG.fondo.naturalWidth * s;
      const off = -wrap(worldOffset * 0.5, dw);
      for (let x = off; x < W; x += dw) {
        ctx.drawImage(IMG.fondo, Math.round(x), GROUND_Y - BG_H, Math.ceil(dw), BG_H);
      }
    }

    // Suelo: se repite en horizontal a la misma velocidad que las tuberías.
    if (ok(IMG.suelo)) {
      const s = GROUND_H / IMG.suelo.naturalHeight;
      const dw = IMG.suelo.naturalWidth * s;
      const off = -wrap(worldOffset, dw);
      for (let x = off; x < W; x += dw) {
        ctx.drawImage(IMG.suelo, Math.round(x), GROUND_Y, Math.ceil(dw), GROUND_H);
      }
    } else {
      rect(0, GROUND_Y, W, 6, '#5fc23a');
      rect(0, GROUND_Y + 6, W, GROUND_H - 6, '#c8854a');
    }
  }

  // ---------- Estado del juego ----------
  let rafId = 0;
  let lastTime = 0;
  let state = 'idle';
  let player, pipes, score, lives, frame, invulnerable, worldOffset;
  let pointerHeld = false;

  const getRecord = () => {
    try { return Number(localStorage.getItem(RECORD_KEY)) || 0; }
    catch (_) { return 0; }
  };
  function saveRecord() {
    if (score > getRecord()) {
      try { localStorage.setItem(RECORD_KEY, String(score)); } catch (_) {}
    }
  }
  function resetGame() {
    player = { y: 145, vy: 0 };
    pipes = [];
    score = 0;
    lives = LIVES_MAX;
    frame = 0;
    invulnerable = 0;
    worldOffset = 0;
    state = 'idle';
    updateHud();
    draw();
  }
  // Elementos del DOM ocultos visualmente; se mantienen para lectores de pantalla.
  function updateHud() {
    scoreEl.textContent = `Puntos: ${score}`;
    recordEl.textContent = `Récord: ${Math.max(getRecord(), score)}`;
    livesEl.textContent = `Vidas: ${lives}/${LIVES_MAX}`;
  }
  function startGame() {
    if (state === 'idle') {
      state = 'playing';
      flap();
    } else if (state === 'gameover' || state === 'won') {
      resetGame();
      state = 'playing';
      flap();
    } else if (state === 'playing') {
      flap();
    }
  }
  function flap() {
    if (state !== 'playing') return;
    player.vy = FLAP;
  }
  function addPipe() {
    // El centro se mantiene lejos de los extremos para garantizar un paso alcanzable.
    const minCenter = 112;
    const maxCenter = GROUND_Y - 112;
    const center = minCenter + Math.random() * (maxCenter - minCenter);
    pipes.push({ x: W + 8, center, scored: false });
  }
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
      a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function loseLife() {
    if (invulnerable > 0 || state !== 'playing') return;
    lives--;
    invulnerable = 100;
    player.y = 145;
    player.vy = 0;
    // Limpia obstáculos cercanos al jugador; conserva los que están lejos.
    pipes = pipes.filter(p => p.x > PLAYER_X + 205);
    updateHud();
    if (lives <= 0) {
      state = 'gameover';
      saveRecord();
      updateHud();
    }
  }
  function update(dt) {
    if (state !== 'playing') return;
    const step = Math.min(dt / 16.667, 2.2);
    frame += step;
    worldOffset += PIPE_SPEED * step;

    player.vy += GRAVITY * step;
    player.y += player.vy * step;

    if (frame % 105 < step) addPipe();

    for (const p of pipes) {
      p.x -= PIPE_SPEED * step;
      const topH = p.center - GAP / 2;
      const bottomY = p.center + GAP / 2;
      const playerBox = {
        x: PLAYER_X + HITBOX.x, y: player.y + HITBOX.y,
        w: HITBOX.w, h: HITBOX.h
      };
      const topBox = { x: p.x, y: -4, w: PIPE_W, h: topH + 4 };
      const bottomBox = { x: p.x, y: bottomY, w: PIPE_W, h: GROUND_Y - bottomY + 4 };

      if (invulnerable <= 0 && (rectsOverlap(playerBox, topBox) || rectsOverlap(playerBox, bottomBox))) {
        loseLife();
        break;
      }
      if (!p.scored && p.x + PIPE_W < PLAYER_X) {
        p.scored = true;
        score = Math.min(TARGET, score + 5);
        updateHud();
        if (score >= TARGET) {
          state = 'won';
          saveRecord();
          updateHud();
          break;
        }
      }
    }
    pipes = pipes.filter(p => p.x + PIPE_W > -10);

    if (invulnerable > 0) invulnerable -= step;
    if (player.y < -5 || player.y + PLAYER_H > GROUND_Y) loseLife();
  }

  // ---------- Dibujo de entidades ----------
  // Dibuja tuberia.png en coordenadas locales (0..h), con la tapa al inicio.
  function drawPipeImage(h) {
    const img = IMG.tuberia;
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const srcCap = sh * PIPE_CAP;
    const capH = Math.min(srcCap * PIPE_W / sw, h);
    ctx.drawImage(img, 0, 0, sw, srcCap, 0, 0, PIPE_W, capH);
    if (h - capH > 0) {
      ctx.drawImage(img, 0, srcCap, sw, sh - srcCap, 0, capH, PIPE_W, h - capH);
    }
  }

  function drawPipeFallback(p, topH, bottomY) {
    const bh = GROUND_Y - bottomY;
    rect(p.x + 7, 0, PIPE_W - 14, topH, '#168d32');
    rect(p.x + 13, 0, 9, topH, '#42d12f');
    rect(p.x + 4, topH - 15, PIPE_W - 8, 15, '#0b1d1b');
    rect(p.x + 7, bottomY, PIPE_W - 14, bh, '#168d32');
    rect(p.x + 13, bottomY, 9, bh, '#42d12f');
    rect(p.x + 4, bottomY, PIPE_W - 8, 15, '#0b1d1b');
  }

  function drawPipe(p) {
    const topH = p.center - GAP / 2;
    const bottomY = p.center + GAP / 2;
    if (!ok(IMG.tuberia)) {
      drawPipeFallback(p, topH, bottomY);
      return;
    }
    // Tubo superior: se voltea para que la tapa quede junto al hueco.
    ctx.save();
    ctx.translate(p.x, topH);
    ctx.scale(1, -1);
    drawPipeImage(topH);
    ctx.restore();
    // Tubo inferior.
    ctx.save();
    ctx.translate(p.x, bottomY);
    drawPipeImage(GROUND_Y - bottomY);
    ctx.restore();
  }

  function drawPlayer() {
    const blink = invulnerable > 0 && Math.floor(frame / 6) % 2 === 0;
    if (blink) return;

    const img = player.vy < -0.5 ? IMG.salto : IMG.idle;
    if (ok(img)) {
      // Contain: conserva la proporción original del sprite, sin deformarlo.
      const scale = Math.min(PLAYER_W / img.naturalWidth, PLAYER_H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img,
        Math.round(PLAYER_X + (PLAYER_W - dw) / 2),
        Math.round(player.y + (PLAYER_H - dh) / 2),
        Math.round(dw), Math.round(dh));
      return;
    }
    // Respaldo si el PNG no carga.
    rect(PLAYER_X + 9, player.y + 8, 30, 44, '#172c50');
    rect(PLAYER_X + 17, player.y, 20, 18, '#eab17a');
  }

  // Panel del HUD dibujado en el canvas.
  function hudPanel(str, x, y, align) {
    const size = 16;
    const pw = measure(str, size) + 24;
    const ph = 32;
    const x0 = align === 'left' ? x : x - pw;
    ctx.fillStyle = 'rgba(12, 34, 62, .92)';
    ctx.fillRect(x0, y, pw, ph);
    ctx.strokeStyle = '#06101d';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0 + 1.5, y + 1.5, pw - 3, ph - 3);
    text(str, x0 + 12, y + 22, size, { outline: false, shadow: false });
  }

  // Corazón de 8 bits: contorno oscuro + relleno; gris si no hay vida.
  const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  function drawHeart(x, y, full) {
    const s = 3;
    ctx.fillStyle = '#1a0608';
    HEART.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '#') ctx.fillRect(x + rx * s - 1, y + ry * s - 1, s + 2, s + 2);
      }
    });
    ctx.fillStyle = full ? '#ff3b4a' : '#4a4f63';
    HEART.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '#') ctx.fillRect(x + rx * s, y + ry * s, s, s);
      }
    });
    if (full) {
      ctx.fillStyle = '#ffc2c7';
      ctx.fillRect(x + s, y + s, s, s);
    }
  }

  function drawHud() {
    hudPanel(`PUNTOS: ${score}`, 14, 12, 'left');
    hudPanel(`RÉCORD: ${Math.max(getRecord(), score)}`, W - 14, 12, 'right');
    for (let i = 0; i < LIVES_MAX; i++) {
      const x = W - 14 - 21 - (LIVES_MAX - 1 - i) * 27;
      drawHeart(x, 52, i < lives);
    }
  }

  function sparkle(x, y, r, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x - 1, y - r, 3, r * 2 + 1);
    ctx.fillRect(x - r, y - 1, r * 2 + 1, 3);
  }

  // Birrete de 8 bits; t es la coordenada superior del dibujo.
  function drawBirrete(cx, t) {
    ctx.fillStyle = '#102b55';
    ctx.beginPath();
    ctx.moveTo(cx - 32, t + 14);
    ctx.lineTo(cx, t);
    ctx.lineTo(cx + 32, t + 14);
    ctx.lineTo(cx, t + 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e9aa24';
    ctx.fillRect(cx + 17, t + 13, 4, 25);
    ctx.fillRect(cx + 17, t + 34, 9, 4);
  }

  // Caja de diálogo con el mismo estilo para inicio, derrota y victoria.
  function overlay(titleLines, body, hint, victory = false) {
    ctx.fillStyle = 'rgba(9, 28, 48, .62)';
    ctx.fillRect(0, 0, W, H);

    const BOX_W = 480, PAD = 22;
    const TITLE_SIZE = 24, BODY_SIZE = 16, LINE = 24;
    const inner = BOX_W - PAD * 2;

    // Si algún título no cabe a 24 px, baja a 16 px.
    const titleSize = titleLines.every(l => measure(l, TITLE_SIZE) <= inner) ? TITLE_SIZE : BODY_SIZE;
    const titleStep = titleSize + 12;
    const bodyLines = body ? wrapText(body, inner, BODY_SIZE) : [];
    const hintLines = hint ? wrapText(hint, inner, BODY_SIZE) : [];

    let boxH = PAD * 2 + titleLines.length * titleStep;
    if (victory) boxH += 52;
    if (bodyLines.length) boxH += 14 + bodyLines.length * LINE;
    if (hintLines.length) boxH += 14 + hintLines.length * LINE;

    const bx = (W - BOX_W) / 2;
    const by = (H - boxH) / 2;
    ctx.fillStyle = '#fff0cf';
    ctx.fillRect(bx, by, BOX_W, boxH);
    ctx.strokeStyle = '#101820';
    ctx.lineWidth = 5;
    ctx.strokeRect(bx, by, BOX_W, boxH);
    ctx.strokeStyle = '#e9aa24';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 7, by + 7, BOX_W - 14, boxH - 14);

    if (victory) {
      sparkle(bx - 22, by + 26, 9, '#ffd45b');
      sparkle(bx + BOX_W + 22, by + 26, 9, '#ffd45b');
      sparkle(bx - 10, by + boxH - 16, 6, '#ffffff');
      sparkle(bx + BOX_W + 10, by + boxH - 16, 6, '#ffffff');
      sparkle(W / 2, by - 12, 7, '#ffd45b');
    }

    let y = by + PAD;
    for (const l of titleLines) {
      text(l, W / 2, y + titleSize, titleSize,
        { color: '#171717', outline: false, shadow: false, align: 'center' });
      y += titleStep;
    }

    if (victory) {
      drawBirrete(W / 2, y + 4);
      y += 52;
    }

    if (bodyLines.length) {
      y += 14;
      for (const l of bodyLines) {
        text(l, W / 2, y + BODY_SIZE, BODY_SIZE,
          { color: '#171717', outline: false, shadow: false, align: 'center' });
        y += LINE;
      }
    }

    if (hintLines.length) {
      y += 14;
      for (const l of hintLines) {
        text(l, W / 2, y + BODY_SIZE, BODY_SIZE,
          { color: '#2a4a6e', outline: false, shadow: false, align: 'center' });
        y += LINE;
      }
    }
  }

  function draw() {
    drawBackground();
    pipes.forEach(drawPipe);
    drawPlayer();
    drawHud();
    if (state === 'idle') {
      overlay(['FLAPPY DE GREGORIS'],
        'Cruza los obstáculos y consigue 100 puntos.',
        'Pulsa espacio, flecha arriba o toca para comenzar');
    } else if (state === 'gameover') {
      overlay(['¡GAME OVER!'],
        `Puntaje: ${score} · Récord: ${getRecord()}`,
        'Toca o pulsa una tecla para volver a intentarlo');
    } else if (state === 'won') {
      overlay(['¡GANASTE UNA', 'MATRÍCULA!'],
        '¡Felicitaciones, De Gregoris!', null, true);
    }
  }

  // Redibuja cuando la fuente pixel termina de cargar.
  if (document.fonts && document.fonts.load) {
    document.fonts.load('16px "Press Start 2P"').then(() => draw()).catch(() => {});
  }

  // ---------- Bucle y eventos ----------
  function loop(timestamp) {
    if (!dialog.open) { rafId = 0; return; }
    const dt = lastTime ? Math.min(timestamp - lastTime, 34) : 16.667;
    lastTime = timestamp;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = 0;
    rafId = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastTime = 0;
    pointerHeld = false;
  }
  function handleAction(event) {
    if (!dialog.open) return;
    if (event) event.preventDefault();
    startGame();
    if (!rafId) startLoop();
  }

  trigger.addEventListener('click', () => {
    resetGame();
    dialog.showModal();
    canvas.focus({ preventScroll: true });
    startLoop();
  });
  dialog.addEventListener('close', stopLoop);
  dialog.addEventListener('cancel', stopLoop);
  window.addEventListener('keydown', (event) => {
    if (!dialog.open) return;
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      handleAction(event);
    }
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (!dialog.open) return;
    event.preventDefault();
    handleAction(event);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dialog.open) {
      // Evita grandes saltos temporales al volver a la pestaña.
      lastTime = 0;
    }
  });

  resetGame();
})();