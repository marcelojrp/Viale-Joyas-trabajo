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
  const PIPE_W = 62;
  const GRAVITY = 0.22;
  const FLAP = -4.65;
  const TARGET = 100;
  const LIVES_MAX = 3;
  const RECORD_KEY = 'viale_flappy_de_gregoris_record';
  const PIPE_CAP = 0.3;  // fracción superior de tuberia.png que corresponde a la tapa
  const FONT = '"Press Start 2P", monospace';

  // Dificultad por nivel (cada 20 puntos sube un nivel, máximo nivel 5).
  const LEVELS = [
    { speed: 2.25, gap: 170, spacing: 105 },
    { speed: 2.5,  gap: 158, spacing: 96 },
    { speed: 2.75, gap: 146, spacing: 88 },
    { speed: 3.0,  gap: 136, spacing: 82 },
    { speed: 3.25, gap: 128, spacing: 78 }
  ];

  // Capas de fondo.
  const CITY_W = 1280, CITY_H = 170;  // skyline, se repite cada 1280 px
  const NEAR_W = 640, NEAR_H = 70;    // árboles en primer plano, se repite cada 640 px

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
  // Versiones que dibujan en una capa offscreen (g).
  function rectG(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  // Círculo fila a fila para conservar el aspecto de pixel art.
  function blobG(g, cx, cy, r, c) {
    g.fillStyle = c;
    const R = Math.floor(r);
    for (let dy = -R; dy <= R; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      g.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2, 1);
    }
  }
  // Crea una capa offscreen una sola vez y la reutiliza en cada frame.
  function makeLayer(w, h, paint) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    paint(g);
    return c;
  }

  // ---------- Recursos (PNG en assets/juego/) ----------
  const ASSET_DIR = 'assets/juego/';
  const loadImg = (name) => {
    const img = new Image();
    img.src = ASSET_DIR + name;
    return img;
  };
  const IMG = {
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

  // ---------- Paleta del escenario ----------
  const C = {
    stone: '#eadfc8', stoneSh: '#c9b99a', stoneDk: '#8f8168',
    glass: '#5d8fbd', glassHi: '#a9d4f2', glassDk: '#2d4a66',
    frame: '#3a5068', red: '#b3262b', navy: '#1d4e89', white: '#f4f4f4'
  };
  const PAL_NEAR = { trunk: '#6b4a2f', dark: '#1d6236', mid: '#2f8f4a', light: '#56b866' };

  // ---------- Elementos del escenario (en capas) ----------
  const LETTERS = {
    F: ['11111', '10000', '11110', '10000', '10000'],
    E: ['11111', '10000', '11110', '10000', '11111'],
    N: ['10001', '11001', '10101', '10011', '10001']
  };
  function paintWordG(g, word, x, y, s, c) {
    g.fillStyle = c;
    let cx = x;
    for (const ch of word) {
      LETTERS[ch].forEach((row, ry) => {
        for (let i = 0; i < 5; i++) {
          if (row[i] === '1') g.fillRect(cx + i * s, y + ry * s, s, s);
        }
      });
      cx += 6 * s;
    }
  }

  // Ventana con marco y brillo.
  function winG(g, x, y, w, h) {
    rectG(g, x, y, w, h, C.frame);
    rectG(g, x + 1, y + 1, w - 2, h - 2, C.glass);
    rectG(g, x + 1, y + 1, 2, h - 2, C.glassHi);
  }

  // Edificio tipo Z: bloque largo con franja de vidrio y letrero FEN.
  function laFEN(g, x, b) {
    const w = 230, h = 78, y = b - h;
    rectG(g, x, y, w, h, C.stone);
    rectG(g, x - 4, y - 6, w + 8, 6, C.stoneSh);
    paintWordG(g, 'FEN', x + w / 2 - 25, y + 10, 3, C.navy);
    rectG(g, x + 10, y + 30, w - 20, 30, C.frame);
    for (let i = 0; i < 7; i++) winG(g, x + 14 + i * 30, y + 33, 24, 24);
    for (let i = 0; i < w; i += 38) rectG(g, x + i + 4, y + 62, 5, h - 62, C.stoneSh);
    rectG(g, x + w / 2 - 8, b - 14, 16, 14, C.frame);
  }

  // Palacio de La Moneda, estilizado: pórtico con columnas, frontón y asta.
  function laMoneda(g, x, b) {
    const w = 200;
    rectG(g, x, b - 62, w, 62, C.stone);
    rectG(g, x - 2, b - 64, w + 4, 4, C.stoneSh);
    // Pabellones de las esquinas.
    rectG(g, x, b - 80, 36, 80, C.stone);
    rectG(g, x + w - 36, b - 80, 36, 80, C.stone);
    rectG(g, x - 2, b - 82, 40, 3, C.stoneSh);
    rectG(g, x + w - 38, b - 82, 40, 3, C.stoneSh);
    winG(g, x + 8, b - 70, 20, 28);
    winG(g, x + w - 28, b - 70, 20, 28);
    // Pórtico central.
    rectG(g, x + 58, b - 96, 84, 96, C.stone);
    rectG(g, x + 56, b - 98, 88, 4, C.stoneSh);
    // Frontón triangular.
    for (let r = 0; r < 14; r++) {
      const wd = 6 + r * 6;
      rectG(g, x + 100 - wd / 2, b - 110 + r, wd, 1, C.stone);
    }
    // Columnas.
    for (let i = 0; i < 6; i++) rectG(g, x + 64 + i * 13, b - 92, 5, 88, C.stoneSh);
    rectG(g, x + 92, b - 22, 16, 22, C.frame);
    // Asta con bandera.
    rectG(g, x + 99, b - 134, 2, 24, '#9aa6b2');
    rectG(g, x + 101, b - 134, 14, 6, C.red);
    rectG(g, x + 101, b - 128, 14, 4, C.white);
  }

  // Banco Central, estilizado: fachada de piedra con ventanas y columnas en la entrada.
  function laBCCh(g, x, b) {
    const w = 170;
    rectG(g, x, b - 96, w, 96, C.stone);
    rectG(g, x - 4, b - 100, w + 8, 6, C.stoneSh);
    for (let i = 0; i < 7; i++) winG(g, x + 8 + i * 23, b - 84, 12, 40);
    rectG(g, x + 54, b - 66, 58, 4, C.stoneSh);
    for (const cx of [58, 68, 92, 102]) rectG(g, x + cx, b - 60, 5, 60, C.stoneSh);
    rectG(g, x + 76, b - 40, 12, 40, C.glassDk);
  }

  // Edificio de departamentos o administrativo.
  function edificioBloque(g, x, b, w, h) {
    rectG(g, x, b - h, w, h, '#e4d8c3');
    rectG(g, x - 3, b - h - 5, w + 6, 5, '#cbbda3');
    for (let ry = b - h + 10; ry < b - 10; ry += 22) {
      for (let cx = x + 8; cx < x + w - 12; cx += 18) winG(g, cx, ry, 10, 12);
    }
  }

  // Torre de vidrio con cuadrícula.
  function torreVidrio(g, x, b, w, h, c) {
    rectG(g, x, b - h, w, h, c);
    rectG(g, x, b - h, w, 3, '#e6eef3');
    for (let ry = b - h + 8; ry < b - 6; ry += 9) {
      for (let cx = x + 4; cx < x + w - 6; cx += 8) {
        rectG(g, cx, ry, 6, 6, ((cx + ry) % 16 === 0) ? '#bfe3f7' : '#3c6a92');
      }
    }
  }

  function treeG(g, x, base, s, p) {
    rectG(g, x - 3 * s, base - 24 * s, 6 * s, 24 * s, p.trunk);
    blobG(g, x, base - 34 * s, 16 * s, p.dark);
    blobG(g, x - 8 * s, base - 27 * s, 11 * s, p.mid);
    blobG(g, x + 9 * s, base - 26 * s, 11 * s, p.mid);
    blobG(g, x - 4 * s, base - 39 * s, 6 * s, p.light);
  }

  // Capa lejana: campus y edificios reconocibles, en una franja de 1280 px.
  const cityFar = makeLayer(CITY_W, CITY_H, g => {
    laMoneda(g, 20, CITY_H);
    edificioBloque(g, 240, CITY_H, 70, 46);
    laFEN(g, 330, CITY_H);
    torreVidrio(g, 580, CITY_H, 58, 110, '#5f93c0');
    laBCCh(g, 660, CITY_H);
    edificioBloque(g, 850, CITY_H, 84, 56);
    torreVidrio(g, 950, CITY_H, 48, 128, '#4f7fae');
    edificioBloque(g, 1010, CITY_H, 130, 60);
    torreVidrio(g, 1150, CITY_H, 50, 118, '#6fa3cf');
    edificioBloque(g, 1210, CITY_H, 70, 40);
  });

  // Capa cercana: árboles, en una franja de 640 px.
  const nearTrees = [[30, 0.8], [110, 0.7], [200, 0.9], [290, 0.75], [380, 0.85], [470, 0.7], [560, 0.9]];
  const nearLayer = makeLayer(NEAR_W, NEAR_H, g => {
    for (const [x, s] of nearTrees) {
      for (const off of [-NEAR_W, 0, NEAR_W]) treeG(g, x + off, NEAR_H, s, PAL_NEAR);
    }
  });

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

    // Skyline lejano: se desplaza a velocidad lenta.
    const farOff = -wrap(worldOffset * 0.4, CITY_W);
    ctx.drawImage(cityFar, Math.round(farOff), GROUND_Y - CITY_H);
    ctx.drawImage(cityFar, Math.round(farOff + CITY_W), GROUND_Y - CITY_H);

    // Árboles cercanos: se desplazan más rápido.
    const nearOff = -wrap(worldOffset * 0.75, NEAR_W);
    ctx.drawImage(nearLayer, Math.round(nearOff), GROUND_Y - NEAR_H);
    ctx.drawImage(nearLayer, Math.round(nearOff + NEAR_W), GROUND_Y - NEAR_H);

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
  const levelIndex = () => Math.min(LEVELS.length - 1, Math.floor(score / 20));
  const currentLevel = () => LEVELS[levelIndex()];

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
    pipes.push({ x: W + 8, center, gap: currentLevel().gap, scored: false });
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
    const lv = currentLevel();
    const step = Math.min(dt / 16.667, 2.2);
    frame += step;
    worldOffset += lv.speed * step;

    player.vy += GRAVITY * step;
    player.y += player.vy * step;

    if (frame % lv.spacing < step) addPipe();

    for (const p of pipes) {
      p.x -= lv.speed * step;
      const topH = p.center - p.gap / 2;
      const bottomY = p.center + p.gap / 2;
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
    const topH = p.center - p.gap / 2;
    const bottomY = p.center + p.gap / 2;
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
    hudPanel(`NIVEL ${levelIndex() + 1}`, 14, 50, 'left');
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
