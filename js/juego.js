/**
 * Flappy DeGregoriano
 * Fase 1: vuelo estilo Flappy hasta 200 puntos (10 niveles; desde 150 se suaviza gradualmente).
 * Fase 2: jefe final. Arturo Prat en submarino, con 3 turnos de esquiva
 * y 3 de ataque. Entre ambos, una transición con choque.
 * Canvas 640x360. Sin dependencias externas.
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
  const TARGET = 250;
  const LIVES_MAX = 4;
  const HEART_STEP = 1;            // corazón de vida entera
  const DMG_MISSILE = 0.5;         // misil: medio corazón
  const DMG_TORPEDO = 1;           // torpedo: un corazón
  const DMG_SWORD = 1;             // espada del villano: un corazón
  const DMG_HOOK = 1;              // gancho que baja del cielo: un corazón
  const DMG_URCHIN = 0.5;          // erizo: medio corazón
  const DMG_SAW = 1;               // sierra circular: un corazón
  const DMG_SHARK = 1;             // tiburón: un corazón
  const DOUBLE_TAP_MS = 450;       // dos toques rápidos = doble salto (lanza billete)
  const RECORD_KEY = 'viale_flappy_de_gregoris_record';
  const PIPE_CAP = 0.3;
  const FONT = '"Press Start 2P", monospace';
  const INTRO_TEXT = 'Arturo Prat está imprimiendo más billetes con su cara, generando inflación.';

  // Dificultad de la fase de vuelo (cada 20 puntos sube un nivel).
  const LEVELS = [
    { speed: 2.16, gap: 181, spacing: 110 },
    { speed: 2.29, gap: 174, spacing: 106 },
    { speed: 2.42, gap: 167, spacing: 101 },
    { speed: 2.55, gap: 161, spacing: 97 },
    { speed: 2.68, gap: 154, spacing: 92 },
    { speed: 2.82, gap: 147, spacing: 88 },
    { speed: 2.90, gap: 140, spacing: 86 },
    { speed: 2.99, gap: 134, spacing: 84 },
    { speed: 3.08, gap: 126, spacing: 81 },
    { speed: 3.17, gap: 122, spacing: 79 }
  ];
  // Desde 150 puntos la dificultad baja de forma gradual hasta 200.
  const EASY_FROM = 150;
  const EASY_TARGET = { speed: 2.68, gap: 154, spacing: 92 };

  // Jefe final: Arturo Prat en submarino (se gira horizontalmente).
  const BOSS = { x: W - 230, w: 220, h: 290 };
  const BOSS_RANGE = { min: 0, max: GROUND_Y - BOSS.h + 30 };
  const BOSS_DRAW_H = 130;   // altura con que se dibuja el villano con armadura
  const EXTRA_MS = 4500;     // duración de la aparición de la armadura
  const EXTRA_BURST_AT = [0, 1300, 2600];  // momentos de los destellos
  // Turnos: dodge = esquivar, attack = atacar mientras esquivas los ataques del villano.
  const PHASES = [
    { type: 'dodge',  stage: 0, diff: 0, duration: 30000 },
    { type: 'attack', stage: 0, hp: 50, duration: 45000 },
    { type: 'dodge',  stage: 1, diff: 1, duration: 34000 },
    { type: 'attack', stage: 1, hp: 80, duration: 50000 },
    { type: 'dodge',  stage: 2, diff: 2, duration: 38000 },
    { type: 'attack', stage: 2, hp: 10, duration: 75000 }
  ];
  const DIFF_NAMES = ['FÁCIL', 'INTERMEDIO', 'DIFÍCIL'];
  // Ataques durante los turnos de esquiva.
  const DODGE_DIFF = [
    { missileEvery: 1500, missileSpeed: 3.2, sharkEvery: 11000, torpedoEvery: 0,    hookEvery: 16000, urchinEvery: 6000 },
    { missileEvery: 1100, missileSpeed: 4.0, sharkEvery: 8000,  torpedoEvery: 4500, hookEvery: 13000, urchinEvery: 5000 },
    { missileEvery: 800,  missileSpeed: 4.6, sharkEvery: 6500,  torpedoEvery: 3500, hookEvery: 11000, urchinEvery: 4000 }
  ];
  // Ataques del villano durante los turnos de ataque (solo misiles).
  const ATTACK_DIFF = [
    { missileEvery: 1500, missileSpeed: 3.6, sharkEvery: 0,    torpedoEvery: 0,    hookEvery: 20000, urchinEvery: 9000 },
    { missileEvery: 1300, missileSpeed: 3.8, sharkEvery: 9000, torpedoEvery: 5500, hookEvery: 16000, urchinEvery: 7000 },
    { missileEvery: 1000, missileSpeed: 4.2, sharkEvery: 7000, torpedoEvery: 4500, hookEvery: 13000, urchinEvery: 6000 }
  ];

  // Criaturas marinas decorativas (aparecen de vez en cuando).
  const CREATURE_TYPES = [
    { type: 'octo',   v: 0.6,  s: [1.1, 1.5], y: [50, GROUND_Y - 150] },
    { type: 'sub',    v: 1.4,  s: [1, 1],     y: [40, GROUND_Y - 120] },
    { type: 'squid',  v: 0.8,  s: [1, 1.3],   y: [30, GROUND_Y - 110] },
    { type: 'jelly',  v: 0.45, s: [1, 1.3],   y: [30, GROUND_Y - 120] }
  ];

  // Capas de fondo de la fase de vuelo.
  const MTN_W = 1920, MTN_H = 158;
  const HILLS_W = 1920, HILLS_H = 116;
  const BACK_W = 1920, BACK_H = 150;
  const CITY_W = 1920, CITY_H = 178;
  const NEAR_W = 640, NEAR_H = 70;

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
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const fmtLives = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  function rect(x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function rectG(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function blobG(g, cx, cy, r, c) {
    g.fillStyle = c;
    const R = Math.floor(r);
    for (let dy = -R; dy <= R; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      g.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2, 1);
    }
  }
  function makeLayer(w, h, paint) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    paint(g);
    return c;
  }
  const rectsOverlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

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
    suelo: loadImg('suelo.png'),
    prat: loadImg('arturoprat.png'),
    pratAngry: loadImg('arturopratenojado.png'),
    swimD: loadImg('degregorioahorasi2.png'),   // al apretar
    swimF: loadImg('degregorioahorasi.png'),    // al caer
    armadura: loadImg('arturoarmadura.png'),    // villano con armadura (ya volteado)
    misil: loadImg('armaduramisil.png'),        // villano lanzando misiles
    espada: loadImg('armaduraespada.png')       // villano con espada
  };
  const ok = (img) => img.complete && img.naturalWidth > 0;

  function drawContain(img, x, y, maxW, maxH) {
    const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.drawImage(img, Math.round(x + (maxW - dw) / 2), Math.round(y + (maxH - dh) / 2),
      Math.round(dw), Math.round(dh));
  }

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

  // ---------- Paleta y primitivas de pixel art ----------
  const C = {
    stone: '#eadfc8', stoneSh: '#c9b99a', stoneDk: '#8f8168',
    glass: '#5d8fbd', glassHi: '#a9d4f2', glassDk: '#2d4a66',
    frame: '#3a5068', red: '#b3262b', navy: '#1d4e89', white: '#f4f4f4'
  };
  const PAL_NEAR = { trunk: '#6b4a2f', dark: '#1d6236', mid: '#2f8f4a', light: '#56b866' };
  const LETTERS = {
    F: ['11111', '10000', '11110', '10000', '10000'],
    E: ['11111', '10000', '11110', '10000', '11111'],
    N: ['10001', '11001', '10101', '10011', '10001'],
    M: ['10001', '11011', '10101', '10001', '10001']
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
  function winG(g, x, y, w, h) {
    rectG(g, x, y, w, h, C.frame);
    rectG(g, x + 1, y + 1, w - 2, h - 2, C.glass);
    rectG(g, x + 1, y + 1, 2, h - 2, C.glassHi);
  }
  function palmG(g, x, b, s) {
    rectG(g, x - 2 * s, b - 44 * s, 4 * s, 44 * s, PAL_NEAR.trunk);
    blobG(g, x - 9 * s, b - 46 * s, 8 * s, PAL_NEAR.mid);
    blobG(g, x + 9 * s, b - 46 * s, 8 * s, PAL_NEAR.mid);
    blobG(g, x, b - 52 * s, 9 * s, PAL_NEAR.dark);
    blobG(g, x - 3 * s, b - 50 * s, 5 * s, PAL_NEAR.light);
  }
  function treeG(g, x, base, s, p) {
    rectG(g, x - 3 * s, base - 24 * s, 6 * s, 24 * s, p.trunk);
    blobG(g, x, base - 34 * s, 16 * s, p.dark);
    blobG(g, x - 8 * s, base - 27 * s, 11 * s, p.mid);
    blobG(g, x + 9 * s, base - 26 * s, 11 * s, p.mid);
    blobG(g, x - 4 * s, base - 39 * s, 6 * s, p.light);
  }

  // ---------- Edificios de la fase de vuelo ----------
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
  function laMoneda(g, x, b) {
    const w = 200;
    rectG(g, x, b - 62, w, 62, C.stone);
    rectG(g, x - 2, b - 64, w + 4, 4, C.stoneSh);
    rectG(g, x, b - 80, 36, 80, C.stone);
    rectG(g, x + w - 36, b - 80, 36, 80, C.stone);
    rectG(g, x - 2, b - 82, 40, 3, C.stoneSh);
    rectG(g, x + w - 38, b - 82, 40, 3, C.stoneSh);
    winG(g, x + 8, b - 70, 20, 28);
    winG(g, x + w - 28, b - 70, 20, 28);
    rectG(g, x + 58, b - 96, 84, 96, C.stone);
    rectG(g, x + 56, b - 98, 88, 4, C.stoneSh);
    for (let r = 0; r < 14; r++) {
      const wd = 6 + r * 6;
      rectG(g, x + 100 - wd / 2, b - 110 + r, wd, 1, C.stone);
    }
    for (let i = 0; i < 6; i++) rectG(g, x + 64 + i * 13, b - 92, 5, 88, C.stoneSh);
    rectG(g, x + 92, b - 22, 16, 22, C.frame);
    rectG(g, x + 99, b - 134, 2, 24, '#9aa6b2');
    // Bandera de Chile: franja blanca arriba y roja abajo, cantón azul con estrella blanca.
    rectG(g, x + 101, b - 134, 15, 5, '#ffffff');
    rectG(g, x + 101, b - 129, 15, 5, '#d52b1e');
    rectG(g, x + 101, b - 134, 7, 5, '#0039a6');
    rectG(g, x + 104, b - 133, 2, 2, '#ffffff');
  }
  function laBCCh(g, x, b) {
    const w = 170;
    rectG(g, x, b - 96, w, 96, C.stone);
    rectG(g, x - 4, b - 100, w + 8, 6, C.stoneSh);
    for (let i = 0; i < 7; i++) winG(g, x + 8 + i * 23, b - 84, 12, 40);
    rectG(g, x + 54, b - 66, 58, 4, C.stoneSh);
    for (const cx of [58, 68, 92, 102]) rectG(g, x + cx, b - 60, 5, 60, C.stoneSh);
    rectG(g, x + 76, b - 40, 12, 40, C.glassDk);
  }
  function laEntel(g, x, b) {
    rectG(g, x + 14, b - 140, 8, 140, '#cfd8e0');
    rectG(g, x + 4, b - 104, 28, 8, '#9aa6b2');
    rectG(g, x + 10, b - 148, 16, 8, '#dfe6ec');
    rectG(g, x + 17, b - 162, 2, 14, '#444f5a');
  }
  function laGranTorre(g, x, b, w, h, c) {
    torreVidrio(g, x, b, w, h - 30, c);
    for (let r = 0; r < 30; r++) {
      const inset = Math.round((r / 30) * (w * 0.3));
      rectG(g, x + inset, b - h + r, w - 2 * inset, 1, c);
    }
    rectG(g, x + w / 2 - 1, b - h - 4, 2, 4, C.red);
  }
  function laMetro(g, x, b) {
    rectG(g, x, b - 30, 44, 30, C.stone);
    rectG(g, x - 3, b - 34, 50, 5, C.frame);
    rectG(g, x + 12, b - 18, 20, 18, C.glassDk);
    rectG(g, x + 21, b - 80, 2, 46, '#9aa6b2');
    rectG(g, x + 10, b - 100, 22, 22, C.red);
    paintWordG(g, 'M', x + 13, b - 96, 3, '#ffffff');
  }
  function laViaducto(g, x, b, w) {
    for (let px = x; px <= x + w - 6; px += 40) rectG(g, px, b - 36, 6, 36, '#b8b2a6');
    rectG(g, x, b - 42, w, 6, '#8f8a80');
    for (let i = 0; i < 3; i++) {
      const cx = x + 20 + i * 52;
      rectG(g, cx, b - 64, 46, 22, '#e8eef2');
      rectG(g, cx, b - 52, 46, 3, '#d8432f');
      for (let wx = cx + 4; wx < cx + 42; wx += 10) rectG(g, wx, b - 60, 7, 6, C.frame);
    }
  }
  function laPlaza(g, x, b, w) {
    rectG(g, x, b - 6, w, 6, '#d8c9a8');
    rectG(g, x + w / 2 - 26, b - 18, 52, 12, C.stoneSh);
    rectG(g, x + w / 2 - 22, b - 16, 44, 8, '#7fbfe6');
    rectG(g, x + w / 2 - 1, b - 34, 2, 16, '#cfeaf9');
    rectG(g, x + w / 2 - 4, b - 36, 8, 2, '#cfeaf9');
    rectG(g, x + 60, b - 10, 16, 4, '#8b5e3c');
    rectG(g, x + w - 76, b - 10, 16, 4, '#8b5e3c');
    palmG(g, x + 14, b - 6, 0.9);
    palmG(g, x + w - 26, b - 6, 0.9);
  }
  function edificioBloque(g, x, b, w, h) {
    rectG(g, x, b - h, w, h, '#e4d8c3');
    rectG(g, x - 3, b - h - 5, w + 6, 5, '#cbbda3');
    for (let ry = b - h + 10; ry < b - 10; ry += 22) {
      for (let cx = x + 8; cx < x + w - 12; cx += 18) winG(g, cx, ry, 10, 12);
    }
  }
  function torreVidrio(g, x, b, w, h, c) {
    rectG(g, x, b - h, w, h, c);
    rectG(g, x, b - h, w, 3, '#e6eef3');
    for (let ry = b - h + 8; ry < b - 6; ry += 9) {
      for (let cx = x + 4; cx < x + w - 6; cx += 8) {
        rectG(g, cx, ry, 6, 6, ((cx + ry) % 16 === 0) ? '#bfe3f7' : '#3c6a92');
      }
    }
  }

  // ---------- Capas de la fase de vuelo ----------
  const cityFar = makeLayer(CITY_W, CITY_H, g => {
    const fillers = [
      [196, 226, 72, 0], [416, 446, 66, 1], [506, 534, 84, 0], [756, 781, 58, 1],
      [823, 864, 76, 0], [914, 944, 68, 1], [1106, 1134, 80, 0], [1162, 1194, 62, 1],
      [1276, 1304, 74, 0], [1366, 1394, 70, 1], [1586, 1614, 88, 0], [1662, 1694, 64, 1],
      [1886, 1904, 50, 0]
    ];
    for (const [x0, x1, h, kind] of fillers) {
      if (kind) torreVidrio(g, x0, CITY_H, x1 - x0, h, '#7aa6c9');
      else edificioBloque(g, x0, CITY_H, x1 - x0, h);
    }
    laPlaza(g, 0, CITY_H, 200);
    laMoneda(g, 220, CITY_H);
    edificioBloque(g, 440, CITY_H, 70, 46);
    laFEN(g, 530, CITY_H);
    laMetro(g, 780, CITY_H);
    torreVidrio(g, 860, CITY_H, 58, 110, '#5f93c0');
    laBCCh(g, 940, CITY_H);
    laEntel(g, 1130, CITY_H);
    edificioBloque(g, 1190, CITY_H, 90, 54);
    laGranTorre(g, 1300, CITY_H, 70, 160, '#4f86b8');
    laViaducto(g, 1390, CITY_H, 200);
    torreVidrio(g, 1610, CITY_H, 56, 100, '#6fa3cf');
    laPlaza(g, 1690, CITY_H, 200);
    edificioBloque(g, 1900, CITY_H, 20, 40);
  });

  const mtnRidge = (x) => {
    const t = 2 * Math.PI * x / MTN_W;
    return 62 + 22 * Math.sin(3 * t + 0.4) + 14 * Math.sin(7 * t + 1.3) +
      8 * Math.sin(15 * t + 2.1) + 6 * Math.sin(29 * t);
  };
  const cordillera = makeLayer(MTN_W, MTN_H, g => {
    for (let x = 0; x < MTN_W; x++) {
      const h = Math.max(20, Math.round(mtnRidge(x)));
      rectG(g, x, MTN_H - h, 1, h, '#7383ad');
      const snow = h - 84;
      if (snow > 0) rectG(g, x, MTN_H - h, 1, Math.min(h, snow + 4), '#f2f6fb');
    }
  });

  const hillTop = (x, cx, rw, hh) => {
    const d = (x - cx) / rw;
    return d * d < 1 ? hh * Math.sqrt(1 - d * d) : 0;
  };
  const hills = makeLayer(HILLS_W, HILLS_H, g => {
    for (let x = 0; x < HILLS_W; x++) {
      const h = Math.round(Math.max(hillTop(x, 520, 190, 72), hillTop(x, 1500, 150, 52)));
      if (h <= 0) continue;
      rectG(g, x, HILLS_H - h, 1, h, '#7a8f55');
      const dark = Math.round(h * 0.45);
      rectG(g, x, HILLS_H - dark, 1, dark, '#5c7448');
    }
    const top = HILLS_H - 72;
    rectG(g, 517, top - 14, 6, 3, C.white);
    rectG(g, 518, top - 11, 4, 11, C.white);
    rectG(g, 515, top - 9, 10, 2, C.white);
  });

  const cityBack = makeLayer(BACK_W, BACK_H, g => {
    let seed = 9137;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let x = 0; x < BACK_W; ) {
      const w = 26 + Math.floor(rnd() * 40);
      const h = 48 + Math.floor(rnd() * 70);
      const y = BACK_H - h;
      const base = ['#8299ad', '#748da5', '#8da3b5', '#657f98'][Math.floor(rnd() * 4)];
      rectG(g, x, y, w, h, base);
      rectG(g, x, y, w, 3, '#a9bac7');
      for (let wy = y + 9; wy < BACK_H - 7; wy += 12) {
        for (let wx = x + 5; wx < x + w - 4; wx += 9) {
          const lit = rnd() > .42;
          rectG(g, wx, wy, 4, 5, lit ? '#c7d5d8' : '#506a83');
        }
      }
      if (rnd() > .72) {
        rectG(g, x + Math.floor(w * .55), y - 10, 2, 10, '#657b8d');
        rectG(g, x + Math.floor(w * .55) - 3, y - 10, 8, 2, '#8da4b4');
      }
      x += w;
    }
  });

  const nearTrees = [[30, 0.8], [110, 0.7], [200, 0.9], [290, 0.75], [380, 0.85], [470, 0.7], [560, 0.9]];
  const nearLayer = makeLayer(NEAR_W, NEAR_H, g => {
    for (const [x, s] of nearTrees) {
      for (const off of [-NEAR_W, 0, NEAR_W]) {
        treeG(g, x + off, NEAR_H, s, PAL_NEAR);
        rectG(g, x + off - 8 * s, NEAR_H - 12 * s, 5 * s, 3 * s, '#78c56a');
      }
    }
    for (let x = 0; x < NEAR_W; x += 80) {
      rectG(g, x, NEAR_H - 7, 42, 7, '#245d3b');
      rectG(g, x + 8, NEAR_H - 12, 18, 5, '#347d49');
    }
  });

  const CLOUDS = [
    { img: 'nubeG', x: 40,  y: 44,  speed: 0.12, w: 110 },
    { img: 'nubeP', x: 330, y: 110, speed: 0.09, w: 64 },
    { img: 'nubeG', x: 560, y: 26,  speed: 0.10, w: 84 },
    { img: 'nubeP', x: 200, y: 150, speed: 0.07, w: 56 }
  ];

  function drawCampus() {
    const skyBands = ['#2878c6', '#348bd4', '#4b9edc', '#68b4e7', '#8bc9ed'];
    const bandH = Math.ceil((GROUND_Y - 4) / skyBands.length);
    skyBands.forEach((color, i) => rect(0, i * bandH, W, bandH + 1, color));
    rect(0, GROUND_Y - 5, W, 5, '#a4d5ee');

    const sunX = 548 - Math.round(wrap(worldOffset * .025, 760));
    const sunY = 48;
    rect(sunX - 20, sunY - 20, 40, 40, 'rgba(255,220,126,.10)');
    rect(sunX - 13, sunY - 13, 26, 26, '#f8d98a');
    rect(sunX - 9, sunY - 17, 18, 34, '#ffe7a8');
    rect(sunX - 17, sunY - 9, 34, 18, '#ffe7a8');
    rect(sunX - 5, sunY - 5, 10, 10, '#fff2c7');

    const pixelCloud = (x, y, scale) => {
      const c = '#e8f3f8', shade = '#c4dfed';
      rect(x + 8*scale, y + 8*scale, 34*scale, 10*scale, shade);
      rect(x + 14*scale, y + 2*scale, 14*scale, 12*scale, c);
      rect(x + 25*scale, y - 3*scale, 17*scale, 17*scale, c);
      rect(x + 39*scale, y + 4*scale, 14*scale, 10*scale, c);
      rect(x + 4*scale, y + 10*scale, 46*scale, 7*scale, c);
      rect(x + 18*scale, y + 15*scale, 24*scale, 3*scale, shade);
    };
    pixelCloud(wrap(80 - worldOffset*.12, 820) - 80, 42, 1);
    pixelCloud(wrap(410 - worldOffset*.09, 920) - 60, 104, .75);
    pixelCloud(wrap(710 - worldOffset*.10, 980) - 70, 28, .8);

    for (const c of CLOUDS) {
      const x = wrap(c.x - worldOffset * c.speed, W + c.w) - c.w;
      const img = IMG[c.img];
      if (ok(img)) {
        const h = Math.round(c.w * img.naturalHeight / img.naturalWidth);
        ctx.drawImage(img, Math.round(x), c.y, c.w, h);
      }
    }

    const mtnOff = -wrap(worldOffset * 0.075, MTN_W);
    const mtnY = GROUND_Y - 52 - MTN_H;
    ctx.drawImage(cordillera, Math.round(mtnOff), mtnY);
    ctx.drawImage(cordillera, Math.round(mtnOff + MTN_W), mtnY);

    const hillOff = -wrap(worldOffset * 0.19, HILLS_W);
    const hillY = GROUND_Y - 37 - HILLS_H;
    ctx.drawImage(hills, Math.round(hillOff), hillY);
    ctx.drawImage(hills, Math.round(hillOff + HILLS_W), hillY);

    const backOff = -wrap(worldOffset * 0.30, BACK_W);
    ctx.drawImage(cityBack, Math.round(backOff), GROUND_Y - BACK_H);
    ctx.drawImage(cityBack, Math.round(backOff + BACK_W), GROUND_Y - BACK_H);

    const farOff = -wrap(worldOffset * 0.43, CITY_W);
    ctx.drawImage(cityFar, Math.round(farOff), GROUND_Y - CITY_H);
    ctx.drawImage(cityFar, Math.round(farOff + CITY_W), GROUND_Y - CITY_H);

    rect(0, GROUND_Y - 8, W, 8, 'rgba(193,218,222,.20)');

    const nearOff = -wrap(worldOffset * 0.72, NEAR_W);
    ctx.drawImage(nearLayer, Math.round(nearOff), GROUND_Y - NEAR_H);
    ctx.drawImage(nearLayer, Math.round(nearOff + NEAR_W), GROUND_Y - NEAR_H);

    drawGroundStrip();
  }

  function drawGroundStrip() {
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

  // ---------- Fondo marino del jefe ----------
  const SEAWEED = Array.from({ length: 12 }, (_, i) => ({
    x: i * 58 + ((i * 17) % 23), h: 32 + ((i * 31) % 40), s: 0.9 + (i % 3) * 0.2, ph: i * 0.8
  }));
  const ROCKS = Array.from({ length: 8 }, (_, i) => ({
    x: i * 82 + ((i * 29) % 37), r: 5 + ((i * 7) % 6)
  }));

  // Criaturas marinas decorativas: aparecen de vez en cuando y cruzan el mar.
  let creatures = [], creatureT = 0, creatureNext = 1500;
  function spawnCreature() {
    const def = CREATURE_TYPES[Math.floor(Math.random() * CREATURE_TYPES.length)];
    const s = lerp(def.s[0], def.s[1], Math.random());
    const y = lerp(def.y[0], def.y[1], Math.random());
    creatures.push({ type: def.type, x: W + 70, y, v: def.v, s, t: Math.random() * 100 });
  }
  function updateCreatures(dt, step) {
    creatureT += dt;
    if (creatureT >= creatureNext) {
      creatureT = 0;
      creatureNext = 3000 + Math.random() * 3000;
      spawnCreature();
    }
    for (const c of creatures) { c.x -= c.v * step; c.t += dt; }
    creatures = creatures.filter(c => c.x > -100);
  }

  function drawOctopus(c) {
    const s = c.s, x = c.x, y = c.y;
    const body = '#b35cc2', light = '#c97ad8', dark = '#7a3a8a';
    blobG(ctx, x, y, 11 * s, body);
    blobG(ctx, x, y - 2 * s, 8 * s, light);
    rect(x - 6 * s, y - 3 * s, 4, 4, '#ffffff');
    rect(x + 3 * s, y - 3 * s, 4, 4, '#ffffff');
    rect(x - 5 * s, y - 2 * s, 2, 2, '#111111');
    rect(x + 4 * s, y - 2 * s, 2, 2, '#111111');
    for (let i = 0; i < 4; i++) {
      const tx = x - 8 * s + i * 5 * s;
      for (let k = 0; k < 5; k++) {
        const wob = Math.sin(c.t / 180 + i + k * 0.7) * 2 * s;
        rect(tx + wob, y + 8 * s + k * 4 * s, 3, 3, dark);
      }
    }
  }

  function drawSubmarine(c) {
    const x = c.x, y = c.y;
    rect(x, y, 44, 16, '#e0b43a');
    rect(x + 4, y + 14, 36, 3, '#b38b22');
    rect(x + 12, y - 6, 14, 7, '#e0b43a');
    rect(x + 18, y - 10, 2, 5, '#b38b22');
    for (let i = 0; i < 3; i++) rect(x + 8 + i * 11, y + 4, 6, 6, '#2d4a66');
    rect(x + 42, y + 3, 5, 10, '#b38b22');
  }

  // Tiburón peligroso que cruza nadando hacia la izquierda.
  function drawShark(c) {
    const s = c.s, x = c.x, y = c.y;
    const body = '#7d8fa3', fin = '#6a7b8f', belly = '#dfe7ee';
    rect(x, y, 50 * s, 14 * s, body);
    rect(x + 4 * s, y + 10 * s, 40 * s, 4 * s, belly);
    rect(x - 8 * s, y + 2 * s, 10 * s, 8 * s, body);
    rect(x + 12 * s, y - 8 * s, 6 * s, 9 * s, fin);
    rect(x + 48 * s, y + 1 * s, 10 * s, 6 * s, fin);
    rect(x + 52 * s, y - 5 * s, 6 * s, 6 * s, fin);
    rect(x + 6 * s, y + 3 * s, 3 * s, 3 * s, '#111111');
    const fl = Math.sin(c.t / 120) * 2 * s;
    rect(x + 18 * s, y + 13 * s + fl, 7 * s, 3 * s, fin);
  }

  // Calamar: manto redondo y tentáculos ondulantes hacia atrás.
  function drawSquid(c) {
    const s = c.s, x = c.x, y = c.y;
    const body = '#f2a6c0', shade = '#e07a9e';
    blobG(ctx, x, y, 9 * s, body);
    rect(x - 9 * s, y + 2 * s, 18 * s, 8 * s, body);
    rect(x - 6 * s, y - 3 * s, 3, 3, '#111111');
    rect(x + 2 * s, y - 3 * s, 3, 3, '#111111');
    for (let i = 0; i < 6; i++) {
      const tx = x - 8 * s + i * 3.2 * s;
      for (let k = 0; k < 5; k++) {
        const wob = Math.sin(c.t / 160 + i + k) * 1.5 * s;
        rect(tx + wob, y + 10 * s + k * 3 * s, 2, 3, shade);
      }
    }
  }

  // Medusa: campana que pulsa y tentáculos largos.
  function drawJelly(c) {
    const s = c.s, x = c.x;
    const y = c.y + Math.sin(c.t / 300) * 1.5 * s;
    blobG(ctx, x, y, 10 * s, '#c8aaff');
    blobG(ctx, x, y - 2 * s, 6 * s, '#e3d6ff');
    for (let i = 0; i < 5; i++) {
      const tx = x - 8 * s + i * 4 * s;
      for (let k = 0; k < 4; k++) {
        const wob = Math.sin(c.t / 200 + i + k) * 2 * s;
        rect(tx + wob, y + 10 * s + k * 4 * s, 2, 3, '#b59bf0');
      }
    }
  }

  const CREATURE_DRAW = {
    octo: drawOctopus,
    sub: drawSubmarine,
    squid: drawSquid,
    jelly: drawJelly
  };

  function drawSea() {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, '#1f8fc9');
    g.addColorStop(1, '#0a3a5e');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // Rayos de luz.
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#e6fbff';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 180 + worldOffset * 0.15) % (W + 200)) - 100;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40, 0);
      ctx.lineTo(x + 120, GROUND_Y);
      ctx.lineTo(x + 60, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Criaturas marinas decorativas.
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (const c of creatures) {
      const draw = CREATURE_DRAW[c.type];
      if (draw) draw(c);
    }
    ctx.restore();

    // Arena.
    rect(0, GROUND_Y, W, H - GROUND_Y + 20, '#d8b57a');
    rect(0, GROUND_Y, W, 4, '#f0d59c');

    // Textura de arena que se desplaza.
    const sandOff = wrap(worldOffset, 24);
    for (let x = -24; x < W + 24; x += 24) {
      const px = x - sandOff;
      rect(px + ((x * 7) % 11), GROUND_Y + 10 + ((x * 13) % 12), 4, 3, '#b8905a');
    }

    // Rocas en la arena.
    for (const r of ROCKS) {
      const x = wrap(r.x - worldOffset, W + 40) - 20;
      blobG(ctx, x, GROUND_Y + 16, r.r, '#8f8168');
      blobG(ctx, x - 1, GROUND_Y + 14, Math.max(2, r.r - 3), '#a89c85');
    }

    // Algas en primer plano.
    for (const p of SEAWEED) {
      const x = wrap(p.x - worldOffset * 1.0, W + 60) - 30;
      drawSeaweed(x, GROUND_Y + 8, p.h, p.s, p.ph);
    }
  }

  function drawSeaweed(x, base, h, s, ph) {
    const sway = Math.sin(frame / 14 + ph);
    for (let k = 0; k < h; k += 3) {
      const px = x + Math.round(sway * (k / h) * 7 * s);
      const c = (k / 3) % 2 === 0 ? '#2e8b57' : '#3fae6a';
      rect(px, base - k, 4, 4, c);
    }
    rect(x + Math.round(sway * 7 * s) - 2, base - h, 6, 3, '#5cc985');
  }

  // ---------- Estado del juego ----------
  let rafId = 0;
  let lastTime = 0;
  let state = 'idle';           // idle | playing | intro | gameover | won
  let mode = 'flappy';          // flappy | boss
  let player, pipes, score, lives, frame, invulnerable, worldOffset;
  let introT = 0;
  let phaseIdx = 0, phaseT = 0, hpLeft = 0, bannerT = 0, bossT = 0, gameMs = 0;
  let missiles = [], sharks = [], torps = [], coins = [], bills = [], bubbles = [];
  let dash = null;              // embestida con espada del villano (solo hay que esquivar)
  let dashT = 0, swordOn = false, extraOn = false;   // ataque extra (armadura)
  let dying = false, dyingT = 0, bossBlast = null, missileFlashT = 0;
  let blasts = [];
  let hooks = [], urchins = [], hookT = 0, urchinT = 0, extraT = 0;
  let fx = [], flashAlpha = 0, extraBursts = 0;   // destellos y flash de la armadura
  let saws = [], sawT = 0;                        // sierras circulares con armadura
  let finaleOn = false, finaleT = 0, shadowT = 0, motes = [];   // escenario al llegar al cuarto corazón
  let announceT = 0, announceText = '';                    // mensajes de power ups
  let interes = [], interesT = 0, interesCd = 0;   // power up económico: interés compuesto (reaparece con el tiempo)
  // explosiones de torpedos
  let approachT = 0;            // tiempo de acercamiento del villano (menos de 5 corazones)
  let hearts = [], bags = [], popups = [], sparks = [];
  let missileT = 0, sharkT = 0, torpT = 0, bubbleT = 0;
  let bagT = 0, bagNext = 30000;
  let vhLeft = 0, vhT = 0;      // corazones del villano (tercer ataque)
  let holding = false;          // true mientras el toque lanza la moneda (se dispara al soltar)
  let lastTapMs = -Infinity;
  let heartDone = false, heartAt = 0;
  let transition = null;        // { t, dur, hit, flash } entre turnos
  let shake = 0;
  const boss = { y: 78, flash: 0 };

  const currentPhase = () => PHASES[Math.min(phaseIdx, PHASES.length - 1)];
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

  // Nivel actual. Desde 150 puntos, la dificultad baja gradualmente hasta 200.
  function currentLevel() {
    if (score < EASY_FROM) return LEVELS[levelIndex()];
    const from = LEVELS[Math.floor(EASY_FROM / 20)];
    const t = Math.min(1, (score - EASY_FROM) / (TARGET - EASY_FROM));
    return {
      speed: lerp(from.speed, EASY_TARGET.speed, t),
      gap: lerp(from.gap, EASY_TARGET.gap, t),
      spacing: lerp(from.spacing, EASY_TARGET.spacing, t)
    };
  }
  const playerBox = () => ({
    x: PLAYER_X + HITBOX.x, y: player.y + HITBOX.y, w: HITBOX.w, h: HITBOX.h
  });

  // Posición horizontal del villano. En el tercer ataque se mueve de lado a lado.
  // Punto de salida de misiles y torpedos con armadura: la mano izquierda del villano.
  function gunPoint() {
    const img = IMG.misil;
    const s = BOSS_DRAW_H / (ok(img) ? img.naturalHeight : 340);
    const dw = (ok(img) ? img.naturalWidth : 328) * s;
    return {
      x: bossX() + BOSS.w - dw + dw * 0.05,
      y: boss.y + BOSS_DRAW_H * 0.33 + (Math.random() * 2 - 1) * 16
    };
  }
  // Zona de la espada: solo cuenta cuando toca a DeGregorio.
  function swordHitBox(boxX, boxY) {
    const img = IMG.espada;
    const s = BOSS_DRAW_H / (ok(img) ? img.naturalHeight : 340);
    const dw = (ok(img) ? img.naturalWidth : 480) * s;
    return { x: boxX + BOSS.w - dw, y: boxY + BOSS_DRAW_H * 0.2, w: dw * 0.7, h: BOSS_DRAW_H * 0.3 };
  }
  // Embestida con espada: sale hacia DeGregorio, horizontal o diagonal, y vuelve a su sitio.
  function startDash() {
    const diag = Math.random() < 0.5;
    const ty = diag ? player.y - 20 : boss.y;
    dash = {
      t: 0, dur: 1300, hit: false,
      sx: bossX(), sy: boss.y,
      tx: PLAYER_X - 70,
      ty: Math.max(BOSS_RANGE.min, Math.min(BOSS_RANGE.max, ty))
    };
  }
  function dashPos(d) {
    const half = d.dur * 0.5;
    const e = d.t < half ? smooth(d.t / half) : smooth(1 - (d.t - half) / half);
    return { x: lerp(d.sx, d.tx, e), y: lerp(d.sy, d.ty, e) };
  }
  function bossX() {
    if (dash && mode === 'boss') return dashPos(dash).x;
    const ph = currentPhase();
    if (mode === 'boss' && !transition && ph.type === 'attack' && ph.stage === 2) {
      let x = BOSS.x + Math.sin(phaseT / 520) * (extraOn ? 70 : 30);
      // Con 7,5 corazones o menos, el villano se acerca horizontalmente a DeGregorio y retrocede.
      if (hpLeft <= 7.5) {
        const k = 0.5 - 0.5 * Math.cos(approachT / (extraOn ? 650 : 1100));
        x -= k * (extraOn ? 260 : 170);
      }
      return x;
    }
    return BOSS.x;
  }
  // Caja de golpe del submarino (cara y cuerpo).
  // Caja de golpe: el submarino usa su caja; con armadura, la caja del tamaño de la armadura.
  const bossHit = () => extraOn
    ? { x: bossX() + BOSS.w - 130, y: boss.y, w: 130, h: BOSS_DRAW_H }
    : { x: bossX() + 12, y: boss.y + 40, w: BOSS.w - 24, h: 190 };

  function resetGame() {
    player = { y: 145, vy: 0 };
    pipes = [];
    score = 0;
    lives = LIVES_MAX;
    frame = 0;
    invulnerable = 0;
    worldOffset = 0;
    introT = 0;
    mode = 'flappy';
    phaseIdx = 0;
    phaseT = 0;
    hpLeft = 0;
    bannerT = 0;
    bossT = 0;
    gameMs = 0;
    missiles = []; sharks = []; torps = []; coins = []; bills = []; bubbles = []; blasts = [];
    hearts = []; bags = []; popups = []; sparks = [];
    missileT = 0; sharkT = 0; torpT = 0; bubbleT = 0;
    bagT = 0; bagNext = 30000;
    vhLeft = 0; vhT = 0;
    holding = false; lastTapMs = -Infinity;
    heartDone = false; heartAt = 0;
    transition = null;
    shake = 0;
    creatures = []; creatureT = 0; creatureNext = 1500;
    boss.y = 78; boss.flash = 0;
    state = 'idle';
    updateHud();
    draw();
  }
  function updateHud() {
    scoreEl.textContent = `Puntos: ${score}`;
    recordEl.textContent = `Récord: ${Math.max(getRecord(), score)}`;
    livesEl.textContent = `Vidas: ${fmtLives(lives)}/${LIVES_MAX}`;
  }
  function flap() {
    if (state !== 'playing') return;
    player.vy = FLAP;
  }
  function addPipe() {
    const minCenter = 112;
    const maxCenter = GROUND_Y - 112;
    const center = minCenter + Math.random() * (maxCenter - minCenter);
    pipes.push({ x: W + 8, center, gap: currentLevel().gap, scored: false });
  }
  function loseLife(dmg = 1) {
    if (invulnerable > 0 || state !== 'playing') return;
    // Desde el 5.º corazón del último turno, los ataques del villano quitan 0.1 menos.
    if (mode === 'boss' && currentPhase().stage === 2 && hpLeft <= 5) dmg = Math.max(0, dmg - 0.1);
    lives = Math.max(0, lives - dmg);
    if (mode === 'boss' && extraOn) {
      // Con la armadura activa, al perder un corazón sale un destello en DeGregorio.
      flashAlpha = Math.max(flashAlpha, 0.6);
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 3;
        fx.push({ x: PLAYER_X + PLAYER_W / 2, y: player.y + PLAYER_H / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 250 + Math.random() * 200, c: '#ff5a6e' });
      }
    }
    invulnerable = 100;
    player.y = mode === 'boss' ? 170 : 145;
    player.vy = 0;
    if (mode === 'flappy') pipes = pipes.filter(p => p.x > PLAYER_X + 205);
    updateHud();
    if (lives <= 0) {
      state = 'gameover';
      saveRecord();
      updateHud();
    }
  }

  // Fase de vuelo.
  function updateFlappy(dt, step) {
    const lv = currentLevel();
    worldOffset += lv.speed * step;
    player.vy += GRAVITY * step;
    player.y += player.vy * step;

    if (frame % lv.spacing < step) addPipe();

    for (const p of pipes) {
      p.x -= lv.speed * step;
      const topH = p.center - p.gap / 2;
      const bottomY = p.center + p.gap / 2;
      const pb = playerBox();
      const topBox = { x: p.x, y: -4, w: PIPE_W, h: topH + 4 };
      const bottomBox = { x: p.x, y: bottomY, w: PIPE_W, h: GROUND_Y - bottomY + 4 };

      if (invulnerable <= 0 && (rectsOverlap(pb, topBox) || rectsOverlap(pb, bottomBox))) {
        loseLife();
        break;
      }
      if (!p.scored && p.x + PIPE_W < PLAYER_X) {
        p.scored = true;
        score = Math.min(TARGET, score + 5);
        updateHud();
        if (score >= TARGET) {
          saveRecord();
          startIntro();
          return;
        }
      }
    }
    pipes = pipes.filter(p => p.x + PIPE_W > -10);

    if (invulnerable > 0) invulnerable -= step;
    if (player.y < -5 || player.y + PLAYER_H > GROUND_Y) loseLife();
  }

  // ---------- Jefe final ----------
  function startIntro() {
    state = 'intro';
    introT = 0;
    pipes = [];
  }
  // Atajo de prueba: la tecla I salta a la ronda 6 (ataque final), desde el vuelo o desde el jefe.
  function skipToBoss() {
    if (state === 'gameover' || state === 'won' || dying) return;
    if (mode === 'flappy') {
      score = TARGET;
      pipes = [];
      beginBoss();
    }
    if (phaseIdx >= 5) return;
    // Ronda 6: ataque final (el villano con armadura).
    phaseIdx = 5;
    transition = null;
    setupPhase();
  }
  // Tras perder en el jefe, se vuelve al inicio del segundo nivel (primer turno de esquiva).
  function restartBoss() {
    lives = LIVES_MAX;
    invulnerable = 0;
    phaseIdx = 0;
    bossT = 0;
    gameMs = 0;
    bagT = 0;
    bagNext = 30000;
    transition = null;
    shake = 0;
    holding = false;
    lastTapMs = -Infinity;
    player.y = 170;
    player.vy = 0;
    state = 'playing';
    setupPhase();
    updateHud();
  }
  function beginBoss() {
    mode = 'boss';
    state = 'playing';
    lives = LIVES_MAX;
    invulnerable = 0;
    phaseIdx = 0;
    bossT = 0;
    bubbles = [];
    setupPhase();
    updateHud();
  }
  function setupPhase() {
    const ph = currentPhase();
    phaseT = 0;
    bannerT = 3200;
    missiles = []; sharks = []; torps = []; coins = []; bills = [];
    hearts = []; popups = []; sparks = [];
    missileT = 0; sharkT = 0; torpT = 0;
    vhT = 0;
    approachT = 0;
    dash = null; dashT = 0; swordOn = false; extraOn = false;
    dying = false; dyingT = 0; bossBlast = null; missileFlashT = 0;
    hooks = []; urchins = []; hookT = 0; urchinT = 0; extraT = 0;
    fx = []; flashAlpha = 0; extraBursts = 0;
    saws = []; sawT = 0;
    finaleOn = false; finaleT = 0; shadowT = 0; motes = [];
    interes = []; interesT = 0; interesCd = 0; announceT = 0;
    vhLeft = (ph.type === 'attack' && ph.stage === 2) ? 10 : 0;
    holding = false; lastTapMs = -Infinity;
    // Un corazón por turno en general; en el tercer ataque lo reemplazan los 10 del villano.
    // En los turnos de ataque no aparecen corazones sueltos (en el segundo nivel son menos frecuentes).
    heartDone = vhLeft > 0 || ph.type === 'attack';
    heartAt = ph.type === 'dodge'
      ? ph.duration * (0.25 + Math.random() * 0.5)
      : 2500 + Math.random() * 4000;
    if (ph.type === 'attack') hpLeft = ph.hp;
    player.vy = 0;
    player.y = 170;
  }
  function nextPhase() {
    phaseIdx++;
    if (phaseIdx >= PHASES.length) {
      state = 'won';
      saveRecord();
      updateHud();
      return;
    }
    beginTransition();
  }
  // Transición con choque: el submarino carga contra DeGregorio y vuelve a su sitio.
  function beginTransition() {
    transition = { t: 0, dur: 1600, hit: false, flash: 0 };
    holding = false;
    coins = []; bills = []; missiles = []; sharks = []; torps = []; hearts = [];
  }
  function updateTransition(dt, step) {
    const tr = transition;
    tr.t += dt;
    worldOffset += 1.5 * step;
    const p = Math.min(1, tr.t / tr.dur);
    if (!tr.hit && p >= 0.5) {
      tr.hit = true;
      tr.flash = 1;
      shake = 12;
      const ix = PLAYER_X + PLAYER_W + 10;
      const iy = player.y + PLAYER_H / 2;
      for (let i = 0; i < 14; i++) {
        sparks.push({ x: ix, y: iy, vx: (Math.random() * 2 - 1) * 3.5, vy: (Math.random() * 2 - 1) * 3.5, t: 0 });
      }
      popups.push({ x: ix + 16, y: player.y - 12, t: 900, text: '¡CHOQUE!' });
    }
    tr.flash = Math.max(0, tr.flash - 0.05 * step);
    shake = Math.max(0, shake - 0.8 * step);
    for (const s of sparks) { s.x += s.vx * step; s.y += s.vy * step; s.t += dt; }
    sparks = sparks.filter(s => s.t < 500);
    if (p >= 1) {
      transition = null;
      setupPhase();
    }
  }
  // Desplazamiento del submarino durante la carga.
  function bossOffsetDuringTransition() {
    if (!transition) return 0;
    const p = Math.min(1, transition.t / transition.dur);
    const e = p < 0.5 ? smooth(p * 2) : smooth((1 - p) * 2);
    return e * (BOSS.x - (PLAYER_X + PLAYER_W + 10));
  }
  // Último turno: cada golpe cuesta más. Con 10 corazones el billete quita 1/4 y la moneda 1/10;
  // con 1 corazón, el billete quita 1/15 y la moneda 1/25.
  function bossHitCost(kind) {
    const t = Math.max(0, Math.min(1, (hpLeft - 1) / 9));
    return kind === 'bill' ? lerp(1 / 15, 1 / 4, t) : lerp(1 / 25, 1 / 10, t);
  }
  function damageBoss(n) {
    // Efectividad del ataque del protagonista: 0.9 (baja 0.1) en todo el juego.
    hpLeft = Math.max(0, hpLeft - n * 0.9);
    boss.flash = 18;
  }
  // Daño del billete normal en el momento (en el último turno baja con cada corazón).
  function billDmgNow() {
    return mode === 'boss' && currentPhase().stage === 2 ? bossHitCost('bill') : 2;
  }
  function fireBill() {
    const x = PLAYER_X + PLAYER_W, y = player.y + PLAYER_H / 2;
    if (interesT > 0) {
      // Con interés compuesto, dos billetes salen en direcciones contrarias (doble daño).
      bills.push({ x, y, vx: 8, vy: -1.6, dead: false, dmg: billDmgNow() });
      bills.push({ x, y, vx: 8, vy: 1.6, dead: false, dmg: billDmgNow() });
    } else {
      bills.push({ x, y, vx: 8, vy: 0, dead: false, dmg: billDmgNow() });
    }
  }

  function updateBoss(dt, step) {
    const ph = currentPhase();
    bossT += dt;
    gameMs += dt;
    if (bannerT > 0) bannerT -= dt;
    if (boss.flash > 0) boss.flash -= step;
    if (invulnerable > 0) invulnerable -= step;

    // El submarino se mueve arriba y abajo en todos los turnos.
    const mid = (BOSS_RANGE.min + BOSS_RANGE.max) / 2;
    const amp = (BOSS_RANGE.max - BOSS_RANGE.min) / 2;
    boss.y = mid + Math.sin(bossT / (ph.type === 'dodge' ? 700 : extraOn ? 300 : 450)) * amp;

    updateCreatures(dt, step);

    bubbleT += dt;
    if (bubbleT > 280) {
      bubbleT = 0;
      bubbles.push({ x: 10 + Math.random() * (W - 20), y: GROUND_Y - 6, r: 1 + Math.random() * 2, v: 0.5 + Math.random() * 0.7 });
    }
    for (const b of bubbles) {
      b.y -= b.v * step;
      b.x += Math.sin(b.y * 0.08) * 0.25 * step;
    }
    bubbles = bubbles.filter(b => b.y > -6);

    for (const bl of blasts) bl.t += dt;
    blasts = blasts.filter(bl => bl.t < 900);
    for (const p of popups) { p.t -= dt; p.y -= 0.3 * step; }
    popups = popups.filter(p => p.t > 0);
    if (bossBlast) { bossBlast.t += dt; if (bossBlast.t >= bossBlast.dur) bossBlast = null; }
    if (interesT > 0) interesT -= dt;
    if (announceT > 0) announceT -= dt;
    for (const f of fx) { f.x += f.vx * step; f.y += f.vy * step; f.vx *= 0.97; f.vy *= 0.97; f.t += dt; }
    fx = fx.filter(f => f.t < f.life);
    if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - 0.06 * step);
    // El temblor de pantalla se apaga durante la animación de la armadura (antes no bajaba en el jefe).
    if (shake > 0) shake = Math.max(0, shake - 0.03 * step);
    if (missileFlashT > 0) missileFlashT -= dt;
    if (dying) {
      // El villano explota al quedarse sin vidas; luego termina el juego.
      dyingT += dt;
      if (dyingT >= 1800) { dying = false; nextPhase(); }
      return;
    }

    if (transition) {
      updateTransition(dt, step);
      return;
    }

    phaseT += dt;
    if (ph.type === 'attack' && ph.stage === 2) {
      if (hpLeft <= 7.5) approachT += dt;
      // Con 4 corazones empieza el final: el escenario cambia y el encuadre se vuelve cinematográfico.
      if (!finaleOn && hpLeft <= 4.7) { finaleOn = true; finaleT = 0; shake = Math.max(shake, 6); flashAlpha = Math.max(flashAlpha, 0.5); }
      if (finaleOn) { finaleT += dt; shadowT += dt; }
      // Con 5 corazones: explosión sin daño y el villano cambia a armadura.
      if (!extraOn && hpLeft <= 5) {
        extraOn = true; extraT = 0; extraBursts = 0;
        bossBlast = { t: 0, dur: 800, big: true };
        shake = 8; flashAlpha = 1;
      }
      if (extraOn && extraT < EXTRA_MS) {
        extraT += dt;
        while (extraBursts < EXTRA_BURST_AT.length && extraT >= EXTRA_BURST_AT[extraBursts]) {
          spawnBurst(extraBursts === 0 ? 30 : 22, extraBursts === 0 ? 6 : 4);
          extraBursts++;
        }
      }
      // Con 3,5 corazones: embestidas con espada, que solo hay que esquivar.
      if (hpLeft <= 3.5) swordOn = true;
      if (swordOn && !dash) {
        dashT += dt;
        if (dashT >= (extraOn ? 3200 : 4500)) { dashT = 0; startDash(); }
      }
      if (dash) {
        dash.t += dt;
        const pos = dashPos(dash);
        boss.y = pos.y;
        if (!dash.hit && dash.t < dash.dur * 0.5 &&
          rectsOverlap(playerBox(), swordHitBox(pos.x, pos.y))) {
          dash.hit = true;
          loseLife(DMG_SWORD);
          if (state !== 'playing') return;
        }
        if (dash.t >= dash.dur) dash = null;
      }
    }
    worldOffset += (ph.type === 'dodge' ? 2.6 : 1.2) * step;

    // El jugador cae por gravedad y vuela con el toque (igual que el nivel 1).
    // Los bordes frenan al personaje en vez de quitar vida.
    player.vy += GRAVITY * step;
    player.y += player.vy * step;
    // Techo y piso: solo devuelven al jugador a la zona de juego, sin quitar vida.
    if (player.y < 6) { player.y = 6; player.vy = 0; }
    if (player.y > GROUND_Y - PLAYER_H - 4) { player.y = GROUND_Y - PLAYER_H - 4; player.vy = 0; }

    const bx = bossX();
    const cfg = ph.type === 'dodge' ? DODGE_DIFF[ph.diff] : ATTACK_DIFF[ph.stage];

    // Corazón de vida por turno.
    if (!heartDone && phaseT >= heartAt) {
      heartDone = true;
      hearts.push({ x: W + 24, y: 40 + Math.random() * (GROUND_Y - 110), w: 21, h: 18, v: 5.5, t: 0, dead: false });
    }
    // Corazones del villano (tercer ataque, 10 en total).
    if (vhLeft > 0) {
      vhT += dt;
      if (vhT >= 4500) {
        vhT = 0;
        vhLeft--;
        hearts.push({ x: bx - 10, y: boss.y + 60 + Math.random() * 120, w: 21, h: 18, v: 2.8, t: 0, dead: false });
      }
    }
    for (const h of hearts) { h.x -= h.v * step; h.t += dt; }
    const pbHeart = playerBox();
    for (const h of hearts) {
      if (!h.dead && rectsOverlap(pbHeart, h)) {
        h.dead = true;
        lives = Math.min(LIVES_MAX, lives + HEART_STEP);
        popups.push({ x: h.x - 10, y: h.y, t: 900, text: 'VIDA +1' });
        updateHud();
      }
    }
    hearts = hearts.filter(h => !h.dead && h.x > -30);

    // Sacos de dinero: desde la segunda esquiva en adelante. Recuperan toda la vida.
    if (phaseIdx >= 2) {
      bagT += dt;
      if (bagT >= bagNext) {
        bagT = 0;
        bagNext = 45000 + Math.random() * 20000;
        bags.push({ x: W + 30, y: 40 + Math.random() * (GROUND_Y - 110), v: 2.0, t: 0, dead: false });
      }
    }
    for (const b of bags) { b.x -= b.v * step; b.t += dt; }
    const pbBag = playerBox();
    for (const b of bags) {
      if (!b.dead && rectsOverlap(pbBag, { x: b.x - 12, y: b.y - 16, w: 24, h: 30 })) {
        b.dead = true;
        lives = LIVES_MAX;
        popups.push({ x: b.x - 20, y: b.y, t: 1000, text: 'VIDA TOTAL' });
        updateHud();
      }
    }
    bags = bags.filter(b => !b.dead && b.x > -30);

    // Power up económico desde el 6.º corazón: duplica monedas y billetes por 10 s.
    // Reaparece cada 15 s mientras dure la fase (cada uno cruza la pantalla en ~6 s, así que no se acumulan).
    if (ph.type === 'attack' && ph.stage === 2 && hpLeft <= 6) {
      interesCd -= dt;
      if (interesCd <= 0) {
        interesCd = 15000;
        interes.push({ x: W + 30, y: 80 + Math.random() * (GROUND_Y - 160), v: 2.0, t: 0, dead: false });
      }
    }
    for (const it of interes) { it.x -= it.v * step; it.t += dt; }
    for (const it of interes) {
      if (!it.dead && rectsOverlap(playerBox(), { x: it.x - 11, y: it.y - 11, w: 22, h: 22 })) {
        it.dead = true;
        interesT = 7500;
        announceT = 3000;
        announceText = '¡INTERÉS COMPUESTO! DISPARO DOBLE';
      }
    }
    interes = interes.filter(it => !it.dead && it.x > -30);

    // Misiles: en esquiva y en ataque.
    missileT += dt;
    if (missileT >= cfg.missileEvery) {
      missileT = 0;
      // Con armadura, los misiles salen de su mano.
      const gp = extraOn ? gunPoint() : { x: bx - 2, y: boss.y + 60 + Math.random() * (BOSS.h * 0.35) };
      missiles.push({ x: gp.x, y: gp.y, w: 30, h: 8, v: cfg.missileSpeed });
      if (extraOn) missileFlashT = 700;
    }
    for (const m of missiles) m.x -= m.v * step;
    missiles = missiles.filter(m => m.x > -40);

    // Tiburones peligrosos: solo en esquiva y muy de vez en cuando.
    if (cfg.sharkEvery) {
      sharkT += dt;
      if (sharkT >= cfg.sharkEvery) {
        sharkT = 0;
        sharks.push({ x: W + 60, y: 40 + Math.random() * (GROUND_Y - 120), s: 1.1, v: 2.2, t: 0 });
      }
    }
    for (const s of sharks) { s.x -= s.v * step; s.t += dt; }
    sharks = sharks.filter(s => s.x > -90);

    // Torpedos: el "otro ataque" desde la segunda esquiva.
    if (cfg.torpedoEvery) {
      torpT += dt;
      if (torpT >= cfg.torpedoEvery) {
        torpT = 0;
        const tg = extraOn ? gunPoint() : { x: bx - 2, y: boss.y + 110 + Math.random() * 50 };
        torps.push({ x: tg.x, y: tg.y, v: 4.4, blastX: 160 + Math.random() * 70, dead: false });
      }
    }
    for (const t of torps) t.x -= t.v * step;
    // Los torpedos explotan al llegar a su punto: la explosión dura un momento y daña si DeGregorio está dentro.
    for (const t of torps) {
      if (t.x <= t.blastX) {
        t.dead = true;
        blasts.push({ x: t.x, y: t.y, t: 0, hit: false });
      }
    }
    torps = torps.filter(t => !t.dead && t.x > -40);

    // Ganchos en el cielo y erizos en el piso: hay que esquivarlos moviéndose.
    if (cfg.urchinEvery) {
      urchinT += dt;
      if (urchinT >= cfg.urchinEvery) {
        urchinT = 0;
        urchins.push({ x: W + 20, y: GROUND_Y - 10, v: 1.1 + Math.random() * 0.6, t: Math.random() * 100, hit: false });
      }
    }
    for (const u of urchins) {
      u.x -= u.v * step;
      u.t += dt;
      if (!u.hit && invulnerable <= 0 && rectsOverlap(playerBox(), { x: u.x - 9, y: u.y - 9, w: 18, h: 18 })) {
        u.hit = true;
        loseLife(DMG_URCHIN);
        if (state !== 'playing') return;
      }
    }
    urchins = urchins.filter(u => u.x > -30 && !u.hit);

    // Sierras circulares: solo con la armadura, después de la aparición. Avanzan en diagonal y rebotan arriba y abajo.
    if (extraOn && extraT >= EXTRA_MS) {
      sawT += dt;
      if (sawT >= 3200) {
        sawT = 0;
        saws.push({ x: bossX() + BOSS.w - 60, y: boss.y + BOSS_DRAW_H / 2, vx: -3.2, vy: (Math.random() < 0.5 ? -1 : 1) * 2.2, r: 13, t: 0, hit: false });
      }
    }
    for (const s of saws) {
      s.x += s.vx * step;
      s.y += s.vy * step;
      s.t += dt;
      if (s.y < 10 || s.y > GROUND_Y - 10) s.vy = -s.vy;
      if (!s.hit && invulnerable <= 0 && rectsOverlap(playerBox(), { x: s.x - 11, y: s.y - 11, w: 22, h: 22 })) {
        s.hit = true;
        loseLife(DMG_SAW);
        if (state !== 'playing') return;
      }
    }
    saws = saws.filter(s => s.x > -40 && !s.hit);

    // Partículas de sedimento que suben desde el fondo durante el final.
    if (finaleOn && Math.random() < 0.25 * step) {
      motes.push({ x: Math.random() * W, y: GROUND_Y - 4, vx: (Math.random() - 0.5) * 0.4, vy: -(0.5 + Math.random() * 0.9), t: 0, life: 2500 + Math.random() * 1500, r: 1 + Math.floor(Math.random() * 2) });
    }
    for (const m of motes) { m.x += m.vx * step; m.y += m.vy * step; m.t += dt; }
    motes = motes.filter(m => m.t < m.life && m.y > -10);

    // Choques con misiles, torpedos y tiburones.
    if (invulnerable <= 0) {
      const pb = playerBox();
      let dmg = 0;
      const m = missiles.find(mm => rectsOverlap(pb, mm));
      if (m) { missiles = missiles.filter(x => x !== m); dmg += DMG_MISSILE; }
      const tp = torps.find(tt => rectsOverlap(pb, { x: tt.x, y: tt.y - 3, w: 35, h: 14 }));
      if (tp) {
        torps = torps.filter(x => x !== tp);
        dmg += DMG_TORPEDO;
        blasts.push({ x: tp.x + 15, y: tp.y + 4, t: 0, hit: true });
      }
      for (const bl of blasts) {
        if (!bl.hit && bl.t < 500 && rectsOverlap(pb, { x: bl.x - 36, y: bl.y - 36, w: 72, h: 72 })) {
          bl.hit = true;
          dmg += DMG_TORPEDO;
        }
      }
      const sk = sharks.find(ss => rectsOverlap(pb, { x: ss.x - 8 * ss.s, y: ss.y - 8 * ss.s, w: 62 * ss.s, h: 24 * ss.s }));
      if (sk) { sharks = sharks.filter(x => x !== sk); dmg += DMG_SHARK; }
      if (dmg > 0) {
        loseLife(dmg);
        if (state !== 'playing') return;
      }
    }

    if (ph.type === 'dodge') {
      if (phaseT >= ph.duration) nextPhase();
      return;
    }

    // Turno de ataque: monedas y billetes contra el villano.
    for (const c of coins) {
      c.x += c.vx * step;
      c.y += c.vy * step;
      if (c.y < 6) { c.y = 6; c.vy = Math.abs(c.vy); c.bounces++; }
      if (c.y > GROUND_Y - 8) { c.y = GROUND_Y - 8; c.vy = -Math.abs(c.vy); c.bounces++; }
    }
    for (const b of bills) { b.x += b.vx * step; b.y += (b.vy || 0) * step; }

    const bh = bossHit();
    for (const c of coins) {
      if (!c.dead && !dash && rectsOverlap({ x: c.x - 6, y: c.y - 6, w: 12, h: 12 }, bh)) {
        c.dead = true;
        damageBoss(ph.stage === 2 ? bossHitCost('coin') : 1);
      }
    }
    for (const b of bills) {
      if (!b.dead && !dash && rectsOverlap({ x: b.x - 12, y: b.y - 6, w: 24, h: 12 }, bh)) {
        b.dead = true;
        damageBoss(b.dmg);
        // Desde el 5.º corazón, cada billete que impacta causa una mini explosión.
        if (ph.stage === 2 && hpLeft <= 5) miniBoom(b.x, b.y);
      }
    }
    coins = coins.filter(c => !c.dead && c.bounces <= 3 && c.x < W + 20);
    bills = bills.filter(b => !b.dead && b.x < W + 30 && b.y > -20 && b.y < GROUND_Y + 20);

    if (ph.type === 'attack' && ph.stage === 2 && hpLeft <= 0) {
      dying = true; dyingT = 0; dash = null;
      bossBlast = { t: 0, dur: 1800, big: true };
      return;
    }
    // Los turnos de ataque no tienen temporizador: terminan cuando el villano se queda sin vida.
    if (hpLeft <= 0) nextPhase();
  }

  // ---------- Entrada del jugador ----------
  function pressAction() {
    if (state === 'idle') {
      state = 'playing';
      mode = 'flappy';
      flap();
      return;
    }
    if (state === 'gameover' && mode === 'boss') {
      restartBoss();
      return;
    }
    if (state === 'gameover' || state === 'won') {
      resetGame();
      state = 'playing';
      flap();
      return;
    }
    if (state === 'intro') {
      if (introT > 1200) beginBoss();
      return;
    }
    if (state === 'playing') {
      flap();
      if (mode === 'boss' && !transition && currentPhase().type === 'attack') {
        if (gameMs - lastTapMs < DOUBLE_TAP_MS) {
          // Doble salto: lanza billete y no lanza moneda.
          fireBill();
          holding = false;
          lastTapMs = -Infinity;
        } else {
          // Toque simple: la moneda sale al soltar.
          holding = true;
          lastTapMs = gameMs;
        }
      }
    }
  }
  function releaseAction() {
    if (state === 'playing' && mode === 'boss' && holding) {
      if (coins.length < 6) {
        coins.push({ x: PLAYER_X + PLAYER_W, y: player.y + PLAYER_H / 2, vx: 5.5, vy: -3.4, bounces: 0, dead: false });
        // Con interés compuesto, una segunda moneda sale en la dirección contraria.
        if (interesT > 0) {
          coins.push({ x: PLAYER_X + PLAYER_W, y: player.y + PLAYER_H / 2, vx: 5.5, vy: 3.4, bounces: 0, dead: false });
        }
      }
      holding = false;
    }
  }

  function update(dt) {
    if (state === 'intro') { introT += dt; return; }
    if (state !== 'playing') return;
    const step = Math.min(dt / 16.667, 2.2);
    frame += step;
    if (mode === 'boss') updateBoss(dt, step);
    else updateFlappy(dt, step);
  }

  // ---------- Dibujo de entidades ----------
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
    ctx.save();
    ctx.translate(p.x, topH);
    ctx.scale(1, -1);
    drawPipeImage(topH);
    ctx.restore();
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
      const scale = Math.min(PLAYER_W / img.naturalWidth, PLAYER_H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img,
        Math.round(PLAYER_X + (PLAYER_W - dw) / 2),
        Math.round(player.y + (PLAYER_H - dh) / 2),
        Math.round(dw), Math.round(dh));
      return;
    }
    rect(PLAYER_X + 9, player.y + 8, 30, 44, '#172c50');
    rect(PLAYER_X + 17, player.y, 20, 18, '#eab17a');
  }

  // Sprite de DeGregorio: al caer usa swimF; al apretar (volar o lanzar) usa swimD.
  function drawBossPlayer() {
    // Con interés compuesto activo, DeGregorio brilla (el brillo desaparece al terminar).
    if (interesT > 0) {
      const cx = PLAYER_X + PLAYER_W / 2, cy = player.y + PLAYER_H / 2;
      const pulse = Math.sin(frame / 4) * 2;
      ctx.globalAlpha = 0.35;
      blobG(ctx, cx, cy, 34 + pulse, '#ffe27a');
      ctx.globalAlpha = 0.6;
      blobG(ctx, cx, cy, 24 + pulse / 2, '#fff3b0');
      ctx.globalAlpha = 1;
    }
    const blink = invulnerable > 0 && Math.floor(frame / 6) % 2 === 0;
    if (blink) return;
    const pressing = holding || player.vy < -0.5;
    const img = pressing ? IMG.swimD : IMG.swimF;
    if (ok(img)) {
      drawContain(img, PLAYER_X - 4, player.y - 4, PLAYER_W + 8, PLAYER_H + 8);
      return;
    }
    rect(PLAYER_X + 9, player.y + 8, 30, 44, '#172c50');
  }

  // Submarino de Arturo Prat, girado horizontalmente para mirar al jugador.
  // Skin del villano según el momento. Los sprites de Prat se voltean; los de armadura ya miran al jugador.
  function bossSprite(angry) {
    if (dash) return IMG.espada;
    if (extraOn && missileFlashT > 0) return IMG.misil;
    if (extraOn) return IMG.armadura;
    return angry ? IMG.pratAngry : IMG.prat;
  }
  // Prat: se voltea para mirar al jugador.
  function drawPratSprite(img, dx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(bossX() - dx + BOSS.w, boss.y);
    ctx.scale(-1, 1);
    if (ok(img)) {
      ctx.drawImage(img, 0, 0, BOSS.w, BOSS.h);
    } else { ctx.fillStyle = '#4a5260'; ctx.fillRect(0, 0, BOSS.w, BOSS.h); }
    ctx.restore();
  }
  // Armaduras: todas a la misma altura (misma escala) y ancladas al borde derecho del villano.
  function drawArmorSprite(img, dx, alpha, flip) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(bossX() - dx + BOSS.w, boss.y);
    if (ok(img)) {
      const s = BOSS_DRAW_H / img.naturalHeight;
      const dw = img.naturalWidth * s;
      if (flip) { ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, dw, BOSS_DRAW_H); }
      else ctx.drawImage(img, -dw, 0, dw, BOSS_DRAW_H);
    } else {
      ctx.fillStyle = '#4a5260';
      ctx.fillRect(-BOSS.w, 0, BOSS.w, BOSS.h);
    }
    ctx.restore();
  }
  // Rayos de luz que giran detrás de la armadura.
  function drawRays(cx, cy, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = '#fff6c8';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + extraT / 900;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - 0.12) * 240, cy + Math.sin(a - 0.12) * 240);
      ctx.lineTo(cx + Math.cos(a + 0.12) * 240, cy + Math.sin(a + 0.12) * 240);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // Destellos: chispas que salen del villano.
  function spawnBurst(n, speed) {
    const cx = bossX() + BOSS.w - 50, cy = boss.y + BOSS_DRAW_H / 2;
    const cols = ['#ffffff', '#ffe27a', '#7ee3ff', '#fff6c8'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.5 + Math.random() * 0.8);
      fx.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 300 + Math.random() * 300, c: cols[Math.floor(Math.random() * cols.length)] });
    }
  }
  function drawBoss(angry, dx) {
    if (boss.flash > 0 && Math.floor(boss.flash / 3) % 2 === 0) return;
    const blending = extraOn && !dash && missileFlashT <= 0 && extraT < EXTRA_MS;
    if (blending) {
      // Aparición épica: explosión, luego rayos y destellos, y Prat se desvanece mientras aparece la armadura.
      const cx = bossX() - dx + BOSS.w - 50, cy = boss.y + BOSS_DRAW_H / 2;
      const rayA = Math.min(1, Math.max(0, (extraT - 700) / 500)) * (1 - Math.max(0, (extraT - 3000) / 1000));
      if (rayA > 0) drawRays(cx, cy, rayA);
      const pratA = 1 - smooth(Math.min(1, extraT / 1300));
      if (pratA > 0) drawPratSprite(angry ? IMG.pratAngry : IMG.prat, dx, pratA);
      let armA = smooth(Math.min(1, Math.max(0, (extraT - 1300) / 1300)));
      if (extraT > 1300 && extraT < 2600 && Math.floor(extraT / 80) % 2 === 0) armA *= 0.35;
      drawArmorSprite(IMG.armadura, dx, armA, true);
      return;
    }
    const sp = bossSprite(angry);
    if (sp === IMG.prat || sp === IMG.pratAngry) drawPratSprite(sp, dx, 1);
    else drawArmorSprite(sp, dx, 1, sp === IMG.armadura);
  }
  // Explosión del villano: es visual y no quita vidas al jugador.
  function drawBossBlast() {
    if (!bossBlast) return;
    const p = Math.min(1, bossBlast.t / bossBlast.dur);
    const cx = bossX() + BOSS.w / 2, cy = boss.y + BOSS.h / 2;
    const r = Math.round(bossBlast.big ? 24 + p * 120 : 14 + p * 60);
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.8;
    blobG(ctx, cx, cy, r, '#ff8a3c');
    blobG(ctx, cx, cy, Math.max(4, r - 22), '#ffe27a');
    blobG(ctx, cx, cy, Math.max(2, r - 52), '#ffffff');
    ctx.restore();
  }

  // Pilar del Banco Central, a la derecha, con su letrero.
  function drawGate() {
    if (phaseIdx !== 5) return;
    const p = transition ? Math.min(1, transition.t / (transition.dur * 0.6)) : 1;
    const x = lerp(W + 10, W - 74, smooth(p));
    // Se destruye con la batalla: el pilar se derrumba desde arriba a medida que el villano pierde corazones.
    const k = 1;   // el pilar queda en pie; se agrieta con los golpes
    const top = 70;
    rect(x, top, 56, GROUND_Y - top, C.stone);
    rect(x + 40, top, 16, GROUND_Y - top, C.stoneSh);
    // Grietas: aparecen a medida que el villano pierde corazones.
    const cracks = phaseIdx === 5 ? Math.min(4, Math.floor((10 - Math.max(0, hpLeft)) / 2)) : 0;
    for (let i = 0; i < cracks; i++) {
      const cx0 = x + 8 + (i % 2) * 28, cy0 = top + 24 + i * 34;
      rect(cx0, cy0, 3, 22, C.stoneDk);
      rect(cx0 + 3, cy0 + 16, 8, 3, C.stoneDk);
      rect(cx0 + 24, cy0 + 8, 3, 14, C.stoneDk);
    }
    // Puerta de bóveda: marco de acero, volante con radios y pernos.
    if (k > 0.4) rect(x + 6, 118, 44, 128, '#5b6670');
    if (k > 0.4) {
      const cx = x + 28, cy = 182;
      blobG(ctx, cx, cy, 24, '#8a96a2');
      blobG(ctx, cx, cy, 19, '#b9c3cc');
      blobG(ctx, cx, cy, 15, '#7b8793');
      rect(cx - 12, cy - 2, 24, 4, '#3a424b');
      rect(cx - 2, cy - 12, 4, 24, '#3a424b');
      blobG(ctx, cx, cy, 4, '#3a424b');
      for (const [dx, dy] of [[0, -20], [0, 20], [-20, 0], [20, 0]]) {
        blobG(ctx, cx + dx, cy + dy, 2, '#2e353d');
      }
    }
    // Letrero: cae cuando el pilar ya está bastante destruido.
    const drop = k < 0.6 ? (0.6 - k) * 340 : 0;
    if (drop < 160) {
      rect(x - 8, 60 + drop, 72, 12, C.stoneSh);
      rect(x - 10, 24 + drop, 76, 34, C.navy);
      rect(x - 10, 24 + drop, 76, 3, '#f0c040');
      text('BANCO', x + 28, 40 + drop, 7, { color: '#ffffff', outline: false, shadow: false, align: 'center' });
      text('CENTRAL', x + 28, 52 + drop, 7, { color: '#ffffff', outline: false, shadow: false, align: 'center' });
    }
  }

  function drawMissile(m) {
    rectG(ctx, m.x + m.w, m.y + 2, 6, 4, '#ff9a3c');
    rectG(ctx, m.x, m.y, m.w, m.h, '#c9d1d9');
    rectG(ctx, m.x, m.y, 6, m.h, '#b3262b');
    rectG(ctx, m.x + m.w - 4, m.y + 1, 4, m.h - 2, '#8a949e');
  }
  // Torpedo: cuerpo metálico con punta roja hacia el jugador.
  function drawTorpedo(t) {
    rect(t.x, t.y, 30, 8, '#5b6b7a');
    rect(t.x, t.y, 6, 8, '#b3262b');
    rect(t.x + 30, t.y - 3, 5, 14, '#44515e');
  }
  function drawCoin(x, y) {
    blobG(ctx, x, y, 6, '#f5c542');
    blobG(ctx, x - 1, y - 1, 2, '#fff3b0');
  }
  function drawBill(x, y, orange) {
    if (orange) {
      rectG(ctx, x - 12, y - 6, 24, 12, '#7a3a00');
      rectG(ctx, x - 11, y - 5, 22, 10, '#ff8c1a');
      blobG(ctx, x, y, 3, '#ffe0a8');
      return;
    }
    rectG(ctx, x - 12, y - 6, 24, 12, '#1f5f36');
    rectG(ctx, x - 11, y - 5, 22, 10, '#4caf6a');
    blobG(ctx, x, y, 3, '#bff0c8');
  }
  // Saco de dinero: recupera toda la vida.
  function drawBag(b) {
    const x = b.x, y = b.y + Math.round(Math.sin(b.t / 200) * 2);
    blobG(ctx, x, y + 2, 11, '#d9b26a');
    blobG(ctx, x, y + 1, 8, '#e8c77f');
    rect(x - 5, y - 15, 10, 6, '#8a6a3a');
    rect(x - 1, y - 7, 2, 16, '#2e7d32');
    rect(x - 5, y - 3, 10, 3, '#2e7d32');
    rect(x - 5, y + 3, 10, 3, '#2e7d32');
  }
  // Corazón de 8 bits en el mar, con leve movimiento.
  function drawHeartPickup(h) {
    const y = h.y + Math.round(Math.sin(h.t / 110) * 2);
    drawHeart(h.x, y, 1);
  }

  // Mini explosión de un billete: pequeño anillo con chispas.
  function miniBoom(x, y) {
    blasts.push({ x, y, t: 0, hit: true, small: true });
    const cols = ['#ffe27a', '#ff8c1a', '#ffffff'];
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 2.5;
      fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 200 + Math.random() * 150, c: cols[i % 3] });
    }
  }
  // Explosión de torpedo: anillo que se expande y se desvanece.
  function drawBlast(bl) {
    const p = Math.min(1, bl.t / 900);
    const r = Math.round(bl.small ? 4 + p * 14 : 8 + p * 36);
    ctx.save();
    ctx.globalAlpha = 1 - p;
    blobG(ctx, bl.x, bl.y, r, '#ff8a3c');
    blobG(ctx, bl.x, bl.y, Math.max(2, r - 9), '#ffe27a');
    ctx.restore();
  }

  // Gancho colgando de una cadena corta, que se desplaza por el cielo.
  function drawHook(h) {
    const y = h.y + Math.round(Math.sin(h.t / 150) * 2);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#4a5664';
    ctx.lineWidth = 2;
    for (const cy of [y - 20, y - 14, y - 8]) {
      ctx.beginPath();
      ctx.ellipse(h.x, cy, 3, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#0b1420';
    ctx.lineWidth = 6;
    hookPath(h.x, y);
    ctx.stroke();
    ctx.strokeStyle = '#d9e2ea';
    ctx.lineWidth = 3;
    hookPath(h.x, y);
    ctx.stroke();
    ctx.restore();
  }
  // Vástago, curva inferior y punta del gancho.
  function hookPath(x, y) {
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + 12);
    ctx.arc(x - 7, y + 12, 7, 0, Math.PI, false);
    ctx.lineTo(x - 14, y + 4);
  }
  // Erizo: esfera con púas que giran.
  function drawUrchin(u) {
    blobG(ctx, u.x, u.y, 7, '#3b1d4f');
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + u.t / 600;
      for (let k = 0; k < 3; k++) {
        const d = 8 + k * 2.5;
        rect(u.x + Math.cos(a) * d - 1, u.y + Math.sin(a) * d - 1, 2, 2, '#e0a0ff');
      }
    }
  }

  // Power up económico: insignia dorada con el signo de porcentaje.
  function drawInteres(it) {
    const y = it.y + Math.round(Math.sin(it.t / 200) * 2);
    blobG(ctx, it.x, y, 11, '#2f7d4f');
    blobG(ctx, it.x, y, 9, '#f5c542');
    text('%', it.x, y + 4, 10, { align: 'center', color: '#1b3d2a', outline: false, shadow: false });
  }

  // Escenario del final: mar oscurecido, sombra gigante que cruza y sedimento que sube.
  function drawFinaleBackdrop(fin) {
    ctx.save();
    ctx.globalAlpha = 0.25 * fin;
    ctx.fillStyle = '#3c0a18';
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.restore();
    const p = (shadowT % 9000) / 9000;
    const x = W + 200 - p * (W + 400);
    ctx.save();
    ctx.globalAlpha = 0.3 * fin;
    ctx.fillStyle = '#03101e';
    ctx.beginPath();
    ctx.ellipse(x, 150, 120, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 100, 150);
    ctx.lineTo(x + 170, 110);
    ctx.lineTo(x + 170, 190);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.6 * fin;
    for (const m of motes) rect(m.x, m.y, m.r, m.r, '#f0d59c');
    ctx.restore();
  }
  // Encuadre cinematográfico: franjas negras, viñeta y tono rojizo que pulsa.
  function drawCinematic(fin) {
    const bar = Math.round(34 * fin);
    rect(0, 0, W, bar, '#000000');
    rect(0, H - bar, W, bar, '#000000');
    const pulse = 0.85 + 0.15 * Math.sin(finaleT / 350);
    ctx.fillStyle = 'rgba(150,20,35,' + (0.22 * fin * pulse).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + (0.65 * fin).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Sierra circular: disco metálico con dientes que giran.
  function drawSaw(s) {
    blobG(ctx, s.x, s.y, s.r, '#9aa6b2');
    blobG(ctx, s.x, s.y, s.r - 4, '#5b6670');
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + s.t / 60;
      blobG(ctx, s.x + Math.cos(a) * (s.r + 1), s.y + Math.sin(a) * (s.r + 1), 2, '#dfe6ec');
    }
    blobG(ctx, s.x, s.y, 3, '#222b33');
  }

  function drawSeaScene() {
    const ph = currentPhase();
    const angry = transition ? (transition.hit && ph.type === 'attack') : ph.type === 'attack';
    const dx = bossOffsetDuringTransition();
    const sx = shake > 0 ? Math.round((Math.random() * 2 - 1) * shake) : 0;

    ctx.save();
    ctx.translate(sx, 0);
    drawSea();
    const fin = finaleOn ? smooth(Math.min(1, finaleT / 3000)) : 0;
    if (fin > 0) drawFinaleBackdrop(fin);
    for (const b of bubbles) blobG(ctx, b.x, b.y, b.r, 'rgba(220,245,255,.7)');
    for (const m of missiles) drawMissile(m);
    for (const t of torps) drawTorpedo(t);
    for (const bl of blasts) drawBlast(bl);
    for (const s of sharks) drawShark(s);
    for (const h of hearts) drawHeartPickup(h);
    for (const b of bags) drawBag(b);
    for (const it of interes) drawInteres(it);
    for (const u of urchins) drawUrchin(u);
    for (const s of saws) drawSaw(s);
    for (const c of coins) drawCoin(c.x, c.y);
    for (const b of bills) drawBill(b.x, b.y, b.orange);
    for (const s of sparks) rect(s.x, s.y, 4, 4, '#ffd45b');
    drawGate();
    drawBoss(angry, dx);
    drawBossBlast();
    for (const f of fx) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); rect(f.x, f.y, 4, 4, f.c); }
    ctx.globalAlpha = 1;
    drawBossPlayer();
    for (const p of popups) text(p.text, p.x, p.y, 10, { color: '#ffd45b', align: 'left' });
    ctx.restore();

    if (transition && transition.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(transition.flash * 0.7).toFixed(2)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (fin > 0) drawCinematic(fin);
    if (flashAlpha > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (flashAlpha * 0.85).toFixed(2) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    drawBossHud();
  }

  // ---------- HUD ----------
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
  const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  // fill: 1 = lleno, 0.5 = mitad izquierda, 0 = vacío.
  function drawHeart(x, y, fill, on = '#ff3b4a', hi = '#ffc2c7') {
    const s = 3;
    ctx.fillStyle = '#1a0608';
    HEART.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '#') ctx.fillRect(x + rx * s - 1, y + ry * s - 1, s + 2, s + 2);
      }
    });
    HEART.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] !== '#') continue;
        const red = rx < Math.round(fill * 7);
        ctx.fillStyle = red ? on : '#4a4f63';
        ctx.fillRect(x + rx * s, y + ry * s, s, s);
      }
    });
    if (fill > 0) {
      ctx.fillStyle = hi;
      ctx.fillRect(x + s, y + s, s, s);
    }
  }
  function drawHeartsAt(x0, y) {
    for (let i = 0; i < LIVES_MAX; i++) {
      const fill = Math.max(0, Math.min(1, lives - i));
      drawHeart(x0 + i * 27, y, fill);
    }
  }
  function drawHud() {
    hudPanel(`PUNTOS: ${score}`, 14, 12, 'left');
    hudPanel(`RÉCORD: ${Math.max(getRecord(), score)}`, W - 14, 12, 'right');
    drawHeartsAt(W - 116, 52);
  }
  function drawBossHud() {
    const ph = currentPhase();
    // Vidas del jugador, en la esquina superior izquierda.
    drawHeartsAt(14, 12);

    // Tercer ataque: la vida del villano se ve como 10 corazones. En los otros turnos no hay barra.
    if (ph.type === 'attack' && ph.stage === 2 && !transition) {
      for (let i = 0; i < 10; i++) {
        drawHeart(W / 2 - 135 + i * 27, 14, Math.max(0, Math.min(1, hpLeft - i)), '#3aa8ff', '#d4f0ff');
      }
    }

    if (announceT > 0) text(announceText, W / 2, 200, 12, { align: 'center', color: '#ffb347' });
    if (bannerT > 0 && !transition) {
      const msg = ph.type === 'dodge'
        ? 'ESQUIVA LOS ATAQUES Y LOS TIBURONES'
        : 'TOQUE: MONEDA · DOBLE: BILLETE';
      text(msg, W / 2, 124, 10, { align: 'center', color: '#ffd45b' });
      text('CUIDADO: ERIZOS EN EL PISO', W / 2, 146, 10, { align: 'center', color: '#ff8a8a' });
    }
  }

  function sparkle(x, y, r, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x - 1, y - r, 3, r * 2 + 1);
    ctx.fillRect(x - r, y - 1, r * 2 + 1, 3);
  }
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
  function overlay(titleLines, body, hint, victory = false) {
    ctx.fillStyle = 'rgba(9, 28, 48, .62)';
    ctx.fillRect(0, 0, W, H);

    const BOX_W = 480, PAD = 22;
    const TITLE_SIZE = 24, BODY_SIZE = 16, LINE = 24;
    const inner = BOX_W - PAD * 2;

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

  function drawIntro() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    text('¡ALERTA!', W / 2, 96, 24, { color: '#ff4d4d', outline: false, shadow: false, align: 'center' });
    const lines = wrapText(INTRO_TEXT, 540, 14);
    lines.forEach((l, i) => {
      text(l, W / 2, 150 + i * 26, 14, { color: '#ffffff', outline: false, shadow: false, align: 'center' });
    });
    if (introT > 1200 && Math.floor(introT / 500) % 2 === 0) {
      text('Toca para enfrentarlo', W / 2, 296, 12, { color: '#ffd45b', outline: false, shadow: false, align: 'center' });
    }
  }

  function draw() {
    if (state === 'intro') {
      drawIntro();
      return;
    }
    if (mode === 'boss') {
      drawSeaScene();
    } else {
      drawCampus();
      pipes.forEach(drawPipe);
      drawPlayer();
      drawHud();
    }

    if (state === 'idle') {
      overlay(['FLAPPY DE GREGORIS'],
        'Cruza los obstáculos y consigue 250 puntos.',
        'Pulsa espacio, flecha arriba o toca para comenzar');
    } else if (state === 'gameover') {
      overlay(['¡VUELVE A', 'INTENTARLO!'],
        `Puntaje: ${score} · Récord: ${getRecord()}`,
        mode === 'boss'
          ? 'Toca o pulsa una tecla para volver al inicio del jefe'
          : 'Toca o pulsa una tecla para jugar de nuevo');
    } else if (state === 'won') {
      overlay(['¡GANASTE UNA', 'MATRÍCULA!'],
        '¡Felicitaciones, De Gregoris!', null, true);
    }
  }

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
    holding = false;
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
    if (event.code === 'KeyI') { skipToBoss(); if (!rafId) startLoop(); return; }
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      if (!event.repeat) { pressAction(); if (!rafId) startLoop(); }
    } else if (event.code === 'ArrowDown') {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    if (!dialog.open) return;
    if (event.code === 'Space' || event.code === 'ArrowUp') releaseAction();
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (!dialog.open) return;
    event.preventDefault();
    pressAction();
    if (!rafId) startLoop();
  });
  window.addEventListener('pointerup', releaseAction);
  window.addEventListener('pointercancel', releaseAction);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dialog.open) lastTime = 0;
  });

  resetGame();
})();