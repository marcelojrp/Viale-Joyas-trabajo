/* Funciones compartidas por catálogo y ficha de producto.
   Todo se guarda en localStorage (simulado, sin servidor). */
(function () {
  'use strict';

  const V = (window.Viale = {});

  V.$ = (sel, root = document) => root.querySelector(sel);
  V.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  V.fmt = (n) => '$' + Number(n).toLocaleString('es-CL');
  V.heartSVG = (on) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.4-9.3-8.9C1.6 8.4 3.5 5 7 5c2.2 0 3.6 1.2 5 3 1.4-1.8 2.8-3 5-3 3.5 0 5.4 3.4 4.3 6.6-1.8 4.5-9.3 8.9-9.3 8.9z"/></svg>`;
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

  // Con talla, cada talla es una línea distinta del carrito (id = producto|talla)
  V.addToCart = (p, talla) => {
    const cart = V.getCart();
    const id = talla ? p.id + '|' + talla : p.id;
    const nombre = talla ? p.nombre + ' · talla ' + talla : p.nombre;
    const item = cart.find((c) => c.id === id);
    if (item) item.qty += 1;
    else cart.push({ id, nombre, precio: p.precio, qty: 1 });
    V.set('cart', cart);
    V.updateCounters();
  };

  V.updateCounters = () => {
    const w = V.$('#wish-count');
    if (w) w.textContent = V.getWishlist().length;
    const c = V.$('#cart-count');
    if (c) c.textContent = V.getCart().reduce((s, i) => s + i.qty, 0);
  };

  /* ---------- Quitar y cambiar cantidades ---------- */
  const mkBtn = (txt, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini-btn';
    b.textContent = txt;
    b.addEventListener('click', fn);
    return b;
  };

  V.removeItem = (type, id) => {
    if (type === 'cart') V.set('cart', V.getCart().filter((c) => c.id !== id));
    else V.set('wishlist', V.getWishlist().filter((w) => w.id !== id));
    V.updateCounters();
  };

  V.changeQty = (id, delta) => {
    const cart = V.getCart()
      .map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c))
      .filter((c) => c.qty > 0);
    V.set('cart', cart);
    V.updateCounters();
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
        <img class="card__photo" src="assets/categorias/${p.categoria}.svg" alt="">
        <h3>${p.nombre}</h3>
      </a>
      <p class="card__meta">${p.material}</p>
      <div class="card__tags">${V.tagsHTML(p)}</div>
      <p class="card__price">${V.fmt(p.precio)}</p>
      <div class="card__actions">
        <button class="heart-btn" type="button" data-id="${p.id}" aria-pressed="${V.isWished(p.id)}" aria-label="${V.isWished(p.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}">${V.heartSVG(V.isWished(p.id))}</button>
        <button class="btn btn--primary btn-add" type="button" data-id="${p.id}">Agregar</button>
      </div>
    </article>`;

  // Delegación de eventos para los botones "Agregar" dentro de un contenedor
  V.bindCards = (root) => {
    root.addEventListener('click', (e) => {
      const heart = e.target.closest('.heart-btn');
      if (heart) {
        const prod = PRODUCTOS.find((x) => x.id === heart.dataset.id);
        if (prod) {
          const on = V.toggleWish(prod);
          heart.innerHTML = V.heartSVG(on);
          heart.setAttribute('aria-pressed', String(on));
          heart.setAttribute('aria-label', on ? 'Quitar de favoritos' : 'Agregar a favoritos');
        }
        return;
      }
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
        const acciones = document.createElement('span');
        acciones.className = 'item-actions';
        if (isCart) {
          acciones.append(
            mkBtn('−', () => { V.changeQty(i.id, -1); V.renderList(type); }),
            mkBtn('+', () => { V.changeQty(i.id, 1); V.renderList(type); })
          );
        }
        acciones.append(mkBtn('Quitar', () => { V.removeItem(type, i.id); V.renderList(type); }));
        li.append(name, price, acciones);
        ul.appendChild(li);
      });
      if (isCart) {
        total.textContent = 'Total: ' + V.fmt(items.reduce((s, i) => s + i.precio * i.qty, 0));
      }
    }
    V.openDialog('dlg-list');
  };

  /* ---------- Menú móvil (tres rayas) ---------- */
  V.initMenu = () => {
    const bar = V.$('.topbar__inner');
    if (!bar || V.$('#btn-menu')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-menu';
    btn.className = 'menu-toggle';
    btn.setAttribute('aria-label', 'Abrir menú');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'drawer');
    btn.innerHTML = '<span></span><span></span><span></span>';
    bar.insertBefore(btn, V.$('.actions', bar));

    const links = V.$$('.subbar__link')
      .map((a) => `<a class="drawer__link" href="${a.getAttribute('href')}">${a.textContent}</a>`)
      .join('');

    const drawer = document.createElement('div');
    drawer.id = 'drawer';
    drawer.className = 'drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="drawer__head">
        <img src="assets/logo.png" alt="Viale Joyas" class="drawer__logo">
        <button type="button" class="drawer__close" aria-label="Cerrar menú">&times;</button>
      </div>
      <form class="search" id="form-search-m" role="search">
        <label for="buscador-m" class="sr-only">Buscar</label>
        <input id="buscador-m" type="search" placeholder="Buscar aros, collares, anillos...">
        <button type="submit" aria-label="Buscar">Buscar</button>
      </form>
      <nav class="drawer__links" aria-label="Categorías">${links}</nav>
      <div class="drawer__actions">
        <button type="button" data-proxy="btn-stores">Buscar tiendas</button>
        <button type="button" data-proxy="btn-account">Crear cuenta</button>
        <button type="button" data-proxy="btn-wishlist">Lista de deseos</button>
        <button type="button" data-proxy="btn-cart">Carrito</button>
      </div>
      <a class="drawer__ig" href="https://www.instagram.com/vialejoyas/?hl=es" target="_blank" rel="noopener">Síguenos en Instagram @vialejoyas</a>`;
    document.body.appendChild(drawer);

    const abrir = (on) => {
      drawer.classList.toggle('is-open', on);
      btn.classList.toggle('is-open', on);
      btn.setAttribute('aria-expanded', String(on));
      drawer.setAttribute('aria-hidden', String(!on));
      document.body.style.overflow = on ? 'hidden' : '';
    };

    btn.addEventListener('click', () => abrir(!drawer.classList.contains('is-open')));
    drawer.querySelector('.drawer__close').addEventListener('click', () => abrir(false));
    drawer.querySelectorAll('.drawer__link').forEach((a) => a.addEventListener('click', () => abrir(false)));

    // Los botones del panel usan los mismos controles de la barra principal
    drawer.querySelectorAll('[data-proxy]').forEach((b) => {
      b.addEventListener('click', () => {
        abrir(false);
        const original = document.getElementById(b.dataset.proxy);
        if (original) original.click();
      });
    });

    drawer.querySelector('#form-search-m').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = drawer.querySelector('#buscador-m').value.trim();
      window.location.href = 'catalogo.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrir(false); });
  };

  /* ---------- Barra principal ---------- */
  V.bindHeader = () => {
    V.initMenu();
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
