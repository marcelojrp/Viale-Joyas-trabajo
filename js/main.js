/* Página principal: festividad, novedades, newsletter.
   Usa las funciones compartidas de shared.js (favoritos, carrito, diálogos). */
(function () {
  'use strict';

  const V = window.Viale;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Barra principal (buscador, cuenta, tiendas, listas) ---------- */
  V.bindHeader();

  /* ---------- Novedades: ficha al hacer clic, favoritos y carrito ---------- */
  $$('#grid-novedades .card').forEach((card) => {
    const id = card.dataset.id;
    const p = PRODUCTOS.find((x) => x.id === id);
    if (!p) return;

    // Clic en la foto o el nombre abre la ficha del producto
    $$('.card__photo, h3', card).forEach((el) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => { window.location.href = 'producto.html?id=' + id; });
    });

    const fav = $('.btn-fav', card);
    const add = $('.btn-add', card);

    function syncFav() {
      const on = V.isWished(id);
      fav.innerHTML = V.heartSVG(on);
      fav.setAttribute('aria-pressed', String(on));
      fav.setAttribute('aria-label', on ? 'Quitar de favoritos' : 'Agregar a favoritos');
    }
    fav.addEventListener('click', () => { V.toggleWish(p); syncFav(); });
    syncFav();

    add.addEventListener('click', () => {
      V.addToCart(p);
      add.textContent = 'Agregado ✓';
      setTimeout(() => { add.textContent = 'Agregar'; }, 1200);
    });
  });

  /* ---------- Newsletter (simulado) ---------- */
  const store = { get: (k, f) => V.get(k, f), set: (k, v) => V.set(k, v) };

  $('#form-newsletter').addEventListener('submit', (e) => {
    e.preventDefault();
    const intereses = $$('input[name="interes"]:checked').map((c) => c.value);
    const sub = {
      nombre: $('#nl-nombre').value.trim(),
      email: $('#nl-email').value.trim(),
      intereses,
      fecha: new Date().toISOString()
    };
    const list = store.get('newsletter', []);
    list.push(sub);
    store.set('newsletter', list);
    $('#nl-msg').textContent = '¡Gracias, ' + sub.nombre + '! Te escribiremos con la información de temporada.';
    e.target.reset();
  });

  /* ---------- Festividad más cercana ---------- */
  // Devuelve el n-ésimo domingo de un mes (0 = enero)
  function nthSunday(year, month, n) {
    const first = new Date(year, month, 1);
    const offset = (7 - first.getDay()) % 7; // días hasta el primer domingo
    return new Date(year, month, 1 + offset + (n - 1) * 7);
  }

  function festividades(year) {
    return [
      { nombre: 'San Valentín', fecha: new Date(year, 1, 14),
        texto: 'Joyas para decir lo que sientes. Aros, collares y anillos en oro y plata.' },
      { nombre: 'Día de la Madre', fecha: nthSunday(year, 4, 2),
        texto: 'Regalos con historia para mamá: piezas delicadas y personalizables.' },
      { nombre: 'Día del Padre', fecha: nthSunday(year, 5, 3),
        texto: 'Detalles sobrios para él, o para regalar a quien ama el estilo sencillo.' },
      { nombre: 'Fiestas Patrias', fecha: new Date(year, 8, 18),
        texto: 'Joyas inspiradas en la temporada de primavera y celebración.' },
      { nombre: 'Navidad', fecha: new Date(year, 11, 25),
        texto: 'Piezas pensadas para regalar y brillar en la temporada navideña.' }
    ];
  }

  function nextFestividad(today) {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const candidates = [...festividades(today.getFullYear()), ...festividades(today.getFullYear() + 1)];
    return candidates.find((f) => f.fecha >= startOfToday) || candidates[0];
  }

  function renderFestividad() {
    const today = new Date();
    const f = nextFestividad(today);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((f.fecha - startOfToday) / 86400000);

    $('#festividad-nombre').textContent = f.nombre;
    $('#festividad-texto').textContent = f.texto;
    $('#festividad-countdown').textContent =
      days === 0 ? '¡Hoy es el día!' : `Faltan ${days} ${days === 1 ? 'día' : 'días'}`;
    $('#link-festividad').textContent = f.nombre;
  }

  renderFestividad();
})();
