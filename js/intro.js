/* Animación de entrada: caja de anillo → anillo de propuesta → logo.
   Escritorio: unos 4 s. Celular: unos 3 s. Una vez por sesión del navegador,
   y sin movimiento si el usuario tiene activada la opción de reducir animaciones. */
(function () {
  const KEY = 'viale_intro_seen';
  const esCelular = window.matchMedia('(max-width: 800px)').matches;
  const DURACION_MS = esCelular ? 3300 : 4300;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let yaVista = false;
  try { yaVista = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* sin acceso a sessionStorage */ }

  if (reduce || yaVista) return;

  try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* ignorar */ }

  const intro = document.createElement('div');
  intro.className = 'intro';
  intro.id = 'intro';
  intro.setAttribute('aria-hidden', 'true');
  intro.innerHTML = `
    <div class="intro__stage">
      <div class="intro__box">
        <div class="intro__base"></div>
        <div class="intro__lid"></div>
      </div>
      <svg class="intro__ring" viewBox="0 0 90 90" aria-hidden="true">
        <ellipse cx="45" cy="52" rx="30" ry="26" fill="none" stroke="#b08d57" stroke-width="5"/>
        <path d="M37 22 L45 12 L53 22 L45 30 Z" fill="#d9c29a" stroke="#b08d57" stroke-width="2.5" stroke-linejoin="round"/>
      </svg>
      <span class="sparkle sparkle--1"></span>
      <span class="sparkle sparkle--2"></span>
      <span class="sparkle sparkle--3"></span>
      <img class="intro__logo" src="assets/logo.png" alt="">
    </div>`;

  document.body.appendChild(intro);
  document.body.style.overflow = 'hidden';

  let terminada = false;
  function terminar() {
    if (terminada) return;
    terminada = true;
    intro.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', alTeclear);
  }
  function alTeclear() { terminar(); }

  intro.addEventListener('click', terminar);
  document.addEventListener('keydown', alTeclear);
  setTimeout(terminar, DURACION_MS);
})();
