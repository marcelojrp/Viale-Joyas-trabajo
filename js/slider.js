/* Carrusel principal: flechas, puntos, teclado, deslizar en celular y avance automático */
(function () {
  'use strict';

  const root = document.querySelector('.hero-slider');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('.slide'));
  const dots = Array.from(root.querySelectorAll('.dot'));
  const INTERVALO = 6000; // ms entre diapositivas
  let actual = 0;
  let timer = null;

  function ir(n) {
    actual = (n + slides.length) % slides.length;
    slides.forEach((s, k) => {
      s.classList.toggle('is-active', k === actual);
      s.setAttribute('aria-hidden', String(k !== actual));
    });
    dots.forEach((d, k) => {
      d.classList.toggle('is-active', k === actual);
      d.setAttribute('aria-current', String(k === actual));
    });
  }

  function iniciar() {
    detener();
    timer = setInterval(() => ir(actual + 1), INTERVALO);
  }

  function detener() {
    clearInterval(timer);
  }

  // Flechas
  root.querySelector('.slider__prev').addEventListener('click', () => { ir(actual - 1); iniciar(); });
  root.querySelector('.slider__next').addEventListener('click', () => { ir(actual + 1); iniciar(); });

  // Puntos
  dots.forEach((d, k) => d.addEventListener('click', () => { ir(k); iniciar(); }));

  // Pausar al pasar el mouse
  root.addEventListener('mouseenter', detener);
  root.addEventListener('mouseleave', iniciar);

  // Teclado (flechas izquierda y derecha, con el carrusel enfocado)
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { ir(actual + 1); iniciar(); }
    if (e.key === 'ArrowLeft') { ir(actual - 1); iniciar(); }
  });

  // Deslizar en celular
  let inicioX = null;
  root.addEventListener('touchstart', (e) => { inicioX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (inicioX === null) return;
    const dx = e.changedTouches[0].clientX - inicioX;
    if (Math.abs(dx) > 40) { ir(dx < 0 ? actual + 1 : actual - 1); iniciar(); }
    inicioX = null;
  }, { passive: true });

  ir(0);
  iniciar();
})();
