/* Funciones compartidas por catálogo y ficha de producto.
   Todo se guarda en localStorage (simulado, sin servidor). */
(function () {
  'use strict';

  const V = (window.Viale = {});

  V.$ = (sel, root = document) => root.querySelector(sel);
  V.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  V.fmt = (n) => '$' + Number(n).toLocaleString('es-CL');
  V.getParam = (name) => new URLSearchParams(window.location.search).get(name);

  /* ---------- Almacenamiento ---------- */
  V.get = (key, fallback) => {
    try {
      const v = localStorage.getItem('viale_' + key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  };
  V.set = (key, value) => {
    try { localStorage.setItem('viale_' + key, JSON.stringify(value)); } catch (e) { /* sin acceso */ }
  };

  /* ---------- Favoritos y carrito ---------- */
  V.getWishlist = () => V.get('wishlist', []);
  V.getCart = () => V.get('cart', []);
  V.isWished = (id) => V.getWishlist().some((w) => w.id === id);

  V.toggleWish = (p) => {
    const list = V.getWishlist();
    const exists = list.some((w) => w.id === p.id);
    const next = exists
      ? list.filter((w) => w.id !== p.id)
      : [...list, { id: p.id, nombre: p.nombre, precio: p.precio }];
    V.set('wishlist', next);
    V.updateCounters();
    return !exists;
  };

  V.addToCart = (p) => {
    const cart = V.getCart();
    const item = cart.find((c) => c.id === p.id);
    if (item) item.qty += 1;
    else cart.push({ id: p.id, nombre: p.nombre, precio: p.precio, qty: 1 });
    V.set('cart', cart);
    V.updateCounters();
  };

  V.updateCounters = () => {
    const w = V.$('#wish-count');
    if (w) w.textContent = V.getWishlist().length;
    const c = V.$('#cart-count');
    if (c) c.textContent = V.getCart().reduce((s, i) => s + i.qty, 0);
  };

  /* ---------- Disponibilidad ---------- */
  V.estado = (n) => {
    if (n === 0) return { cls: 'st-agotado', txt: 'Agotado' };
    if (n <= 2) return { cls: 'st-ultimas', txt: 'Últimas unidades' };
    return { cls: 'st-ok', txt: 'Disponible' };
  };

  /* ---------- Tarjetas de producto ---------- */
  V.tagsHTML = (p) =>
    p.etiquetas.map((t) => `<span class="tag">${ETIQUETAS[t]}</span>`).join('');

  V.cardHTML = (p) => `
    <article class="card">
      <a class="card__link" href="producto.html?id=${p.id}">
        <div class="card__img" aria-hidden="true">${ICONOS[p.categoria] || '◇'}</div>
        <h3>${p.nombre}</h3>
      </a>
      <p class="card__meta">${p.material}</p>
      <div class="card__tags">${V.tagsHTML(p)}</div>
      <p class="card__price">${V.fmt(p.precio)}</p>
      <div class="card__actions">
        <button class="btn btn--primary btn-add" type="button" data-id="${p.id}">Agregar</button>
      </div>
    </article>`;

  // Delegación de eventos para los botones "Agregar" dentro de un contenedor
  V.bindCards = (root) => {
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-add');
      if (!btn) return;
      const p = PRODUCTOS.find((x) => x.id === btn.dataset.id);
      if (!p) return;
      V.addToCart(p);
      btn.textContent = 'Agregado ✓';
      setTimeout(() => { btn.textContent = 'Agregar'; }, 1200);
    });
  };

  /* ---------- Diálogos ---------- */
  V.openDialog = (id) => {
    const d = document.getElementById(id);
    if (d && typeof d.showModal === 'function') d.showModal();
  };

  V.renderList = (type) => {
    const isCart = type === 'cart';
    const items = isCart ? V.getCart() : V.getWishlist();
    V.$('#dlg-list-title').textContent = isCart ? 'Tu carrito' : 'Lista de deseos';
    const ul = V.$('#dlg-list-items');
    const total = V.$('#dlg-list-total');
    ul.innerHTML = '';
    total.textContent = '';

    if (items.length === 0) {
      ul.innerHTML = '<li class="muted">Aún no hay productos.</li>';
    } else {
      items.forEach((i) => {
        const li = document.createElement('li');
        const name = document.createElement('span');
        const price = document.createElement('strong');
        name.textContent = isCart ? `${i.nombre} × ${i.qty}` : i.nombre;
        price.textContent = V.fmt(isCart ? i.precio * i.qty : i.precio);
        li.append(name, price);
        ul.appendChild(li);
      });
      if (isCart) {
        total.textContent = 'Total: ' + V.fmt(items.reduce((s, i) => s + i.precio * i.qty, 0));
      }
    }
    V.openDialog('dlg-list');
  };

  /* ---------- Barra principal ---------- */
  V.bindHeader = () => {
    const search = V.$('#form-search');
    if (search) {
      search.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = V.$('#buscador').value.trim();
        window.location.href = 'catalogo.html' + (q ? '?q=' + encodeURIComponent(q) : '');
      });
    }

    V.$('#btn-wishlist').addEventListener('click', () => V.renderList('wish'));
    V.$('#btn-cart').addEventListener('click', () => V.renderList('cart'));
    V.$('#btn-stores').addEventListener('click', () => V.openDialog('dlg-stores'));
    V.$('#btn-account').addEventListener('click', () => V.openDialog('dlg-account'));

    // Cerrar al hacer clic fuera del contenido
    V.$$('dialog').forEach((d) => {
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    });

    const form = V.$('#form-account');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = { nombre: V.$('#acc-nombre').value.trim(), email: V.$('#acc-email').value.trim() };
        V.set('user', user);
        V.$('#dlg-account').close();
        V.$('#btn-account .action__label').textContent = 'Hola, ' + user.nombre.split(' ')[0];
        form.reset();
      });
    }

    const user = V.get('user', null);
    if (user) V.$('#btn-account .action__label').textContent = 'Hola, ' + user.nombre.split(' ')[0];

    V.updateCounters();
  };
})();
