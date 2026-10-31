/* Viale Joyas · Barras principal y secundaria
   Todo se guarda en localStorage (simulado, sin servidor). */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt = (n) => '$' + Number(n).toLocaleString('es-CL');

  /* ---------- Almacenamiento ---------- */
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('viale_' + key);
        return v ? JSON.parse(v) : fallback;
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('viale_' + key, JSON.stringify(value)); } catch (e) { /* sin acceso */ }
    }
  };

  let wishlist = store.get('wishlist', []);
  let cart = store.get('cart', []);

  /* ---------- Contadores ---------- */
  function updateCounters() {
    $('#wish-count').textContent = wishlist.length;
    $('#cart-count').textContent = cart.reduce((s, i) => s + i.qty, 0);
  }

  /* ---------- Favoritos y carrito ---------- */
  function productFromCard(card) {
    return {
      id: card.dataset.id,
      nombre: card.dataset.nombre,
      precio: Number(card.dataset.precio)
    };
  }

  $$('.card').forEach((card) => {
    const p = productFromCard(card);

    $('.btn-fav', card).addEventListener('click', () => {
      const exists = wishlist.some((w) => w.id === p.id);
      wishlist = exists ? wishlist.filter((w) => w.id !== p.id) : [...wishlist, p];
      store.set('wishlist', wishlist);
      $('.btn-fav', card).textContent = exists ? 'Favorito' : 'En favoritos';
      updateCounters();
    });

    $('.btn-add', card).addEventListener('click', () => {
      const item = cart.find((c) => c.id === p.id);
      if (item) item.qty += 1;
      else cart.push({ ...p, qty: 1 });
      store.set('cart', cart);
      updateCounters();
    });

    // Marcar el estado inicial del botón de favorito
    if (wishlist.some((w) => w.id === p.id)) $('.btn-fav', card).textContent = 'En favoritos';
  });

  /* ---------- Diálogos ---------- */
  function openDialog(id) {
    const dlg = document.getElementById(id);
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  }

  function openList(type) {
    const isCart = type === 'cart';
    const items = isCart ? cart : wishlist;
    $('#dlg-list-title').textContent = isCart ? 'Tu carrito' : 'Lista de deseos';
    const ul = $('#dlg-list-items');
    ul.innerHTML = '';

    if (items.length === 0) {
      ul.innerHTML = '<li class="muted">Aún no hay productos.</li>';
      $('#dlg-list-total').textContent = '';
    } else {
      items.forEach((i) => {
        const li = document.createElement('li');
        const label = isCart ? `${i.nombre} × ${i.qty}` : i.nombre;
        const price = isCart ? fmt(i.precio * i.qty) : fmt(i.precio);
        li.innerHTML = `<span></span><strong></strong>`;
        li.firstChild.textContent = label;
        li.lastChild.textContent = price;
        ul.appendChild(li);
      });
      $('#dlg-list-total').textContent = isCart
        ? 'Total: ' + fmt(cart.reduce((s, i) => s + i.precio * i.qty, 0))
        : '';
    }
    openDialog('dlg-list');
  }

  $('#btn-wishlist').addEventListener('click', () => openList('wish'));
  $('#btn-cart').addEventListener('click', () => openList('cart'));
  $('#btn-stores').addEventListener('click', () => openDialog('dlg-stores'));
  $('#btn-account').addEventListener('click', () => openDialog('dlg-account'));

  // Cerrar al hacer clic fuera del contenido del diálogo
  $$('dialog').forEach((dlg) => {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  });

  /* ---------- Crear cuenta (simulado) ---------- */
  $('#form-account').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = {
      nombre: $('#acc-nombre').value.trim(),
      email: $('#acc-email').value.trim()
    };
    store.set('user', user);
    $('#dlg-account').close();
    $('#btn-account .action__label').textContent = 'Hola, ' + user.nombre.split(' ')[0];
    e.target.reset();
  });

  const savedUser = store.get('user', null);
  if (savedUser) $('#btn-account .action__label').textContent = 'Hola, ' + savedUser.nombre.split(' ')[0];

  /* ---------- Newsletter (simulado) ---------- */
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
  updateCounters();
})();
