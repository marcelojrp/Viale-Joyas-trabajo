/* Colorimetría: estima el subtono de piel a partir de una zona elegida por el usuario.
   Todo ocurre en el navegador; la foto nunca sale del dispositivo. */
(function () {
  'use strict';

  const V = window.Viale;
  V.bindHeader();

  const MAX_ANCHO = 600;   // ancho máximo de trabajo (px)
  const RADIO = 7;         // muestra de 15x15 px alrededor del clic

  const input = document.getElementById('foto');
  const wrap = document.getElementById('canvas-wrap');
  const canvas = document.getElementById('lienzo');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const instruccion = document.getElementById('instruccion');
  const reiniciar = document.getElementById('reiniciar');
  const resultado = document.getElementById('resultado');
  const gridReco = document.getElementById('grid-reco');
  const reco = document.getElementById('recomendadas');

  let imagen = null;

  /* ---------- Conversión de color: sRGB → Lab (D65) ---------- */
  function linear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function rgbToLab(r, g, b) {
    const R = linear(r), G = linear(g), B = linear(b);
    const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
    const Y = (0.2126 * R + 0.7152 * G + 0.0722 * B);
    const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return {
      L: 116 * fy - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz)
    };
  }

  /* ---------- Muestra de piel ---------- */
  // Promedia los píxeles de la zona, descartando brillos (muy claros) y sombras (muy oscuros)
  function muestrear(x, y) {
    const x0 = Math.max(0, x - RADIO), y0 = Math.max(0, y - RADIO);
    const w = Math.min(RADIO * 2 + 1, canvas.width - x0);
    const h = Math.min(RADIO * 2 + 1, canvas.height - y0);
    const data = ctx.getImageData(x0, y0, w, h).data;

    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 40 || lum > 240) continue; // sombras y reflejos
      sr += r; sg += g; sb += b; n++;
    }
    if (n === 0) return null;
    return { r: Math.round(sr / n), g: Math.round(sg / n), b: Math.round(sb / n) };
  }

  /* ---------- Clasificación ---------- */
  function clasificar(rgb) {
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
    // Ángulo de tono en el plano a*b*: pieles con más amarillo/dorado tienen ángulo mayor
    let hue = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
    if (hue < 0) hue += 360;

    let subtono;
    if (hue >= 58) subtono = 'calido';
    else if (hue <= 48) subtono = 'frio';
    else subtono = 'neutro';

    let profundidad;
    if (lab.L >= 72) profundidad = 'clara';
    else if (lab.L >= 58) profundidad = 'media';
    else profundidad = 'oscura';

    return { subtono, profundidad, hue: Math.round(hue), L: Math.round(lab.L) };
  }

  const TEXTOS = {
    calido: {
      titulo: 'Subtono cálido',
      desc: 'Tu piel tiende a tonos dorados, melocotón o marfil. Te favorecen el oro, el gold filled y las piedras cálidas como el ámbar o el coral.',
      materiales: ['oro', 'gold']
    },
    frio: {
      titulo: 'Subtono frío',
      desc: 'Tu piel tiende a tonos rosados o azulados. Te favorecen la plata 925 y las piedras frías como la amatista o el cristal.',
      materiales: ['plata']
    },
    neutro: {
      titulo: 'Subtono neutro',
      desc: 'Tu piel combina tonos cálidos y fríos. Puedes usar tanto oro como plata, y mezclarlos sin problema.',
      materiales: null
    }
  };

  const PROFUNDIDAD = {
    clara: 'Profundidad: clara',
    media: 'Profundidad: media',
    oscura: 'Profundidad: oscura'
  };

  /* ---------- Recomendaciones ---------- */
  function recomendar(subtono) {
    let lista;
    if (subtono === 'neutro') {
      const oro = PRODUCTOS.filter((p) => /oro|gold/i.test(p.material)).slice(0, 2);
      const plata = PRODUCTOS.filter((p) => /plata/i.test(p.material)).slice(0, 2);
      lista = [...oro, ...plata];
    } else {
      const claves = TEXTOS[subtono].materiales;
      lista = PRODUCTOS.filter((p) => claves.some((c) => p.material.toLowerCase().includes(c))).slice(0, 4);
    }
    gridReco.innerHTML = lista.map((p) => V.cardHTML(p)).join('');
    V.bindCards(gridReco);
    reco.hidden = false;
  }

  /* ---------- Dibujo ---------- */
  function dibujar(marca) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    if (marca) {
      ctx.beginPath();
      ctx.arc(marca.x, marca.y, RADIO + 2, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#b08d57';
      ctx.stroke();
    }
  }

  /* ---------- Eventos ---------- */
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, MAX_ANCHO / img.width);
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      imagen = img;
      dibujar(null);
      URL.revokeObjectURL(img.src);

      wrap.hidden = false;
      instruccion.hidden = false;
      reiniciar.hidden = false;
      resultado.hidden = true;
      reco.hidden = true;
    };
    img.onerror = () => {
      instruccion.hidden = false;
      instruccion.textContent = 'No pudimos abrir esa imagen. Prueba con otra foto (JPG o PNG).';
    };
    img.src = URL.createObjectURL(file);
  });

  canvas.addEventListener('click', (e) => {
    if (!imagen) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));

    const rgb = muestrear(x, y);
    dibujar({ x, y });

    if (!rgb) {
      instruccion.hidden = false;
      instruccion.textContent = 'Esa zona está muy oscura o muy iluminada. Prueba con otra parte de la piel.';
      resultado.hidden = true;
      reco.hidden = true;
      return;
    }

    const c = clasificar(rgb);
    document.getElementById('swatch').style.background = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    document.getElementById('subtono-titulo').textContent = TEXTOS[c.subtono].titulo;
    document.getElementById('subtono-desc').textContent = TEXTOS[c.subtono].desc;
    document.getElementById('profundidad').textContent = PROFUNDIDAD[c.profundidad];
    resultado.hidden = false;
    instruccion.textContent = 'Zona medida. Puedes hacer clic en otra parte para comparar.';

    recomendar(c.subtono);
  });

  reiniciar.addEventListener('click', () => {
    input.value = '';
    imagen = null;
    wrap.hidden = true;
    instruccion.hidden = true;
    instruccion.textContent = 'Haz clic sobre la piel (mejilla, frente o cuello).';
    reiniciar.hidden = true;
    resultado.hidden = true;
    reco.hidden = true;
  });
})();
