/* Tarjeta de regalo simulada: valores predeterminados, mensaje y código de ejemplo.
   No hay cobro ni envío: todo ocurre en el navegador. */
(function () {
  const dlg = document.getElementById('dlg-regalo');
  const form = document.getElementById('form-regalo');
  const resultado = document.getElementById('regalo-resultado');
  if (!dlg || !form) return;

  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigoActual = '';

  function generarCodigo() {
    let s = '';
    for (let i = 0; i < 8; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
    return 'VIALE-' + s;
  }

  function mostrarFormulario() {
    form.hidden = false;
    resultado.hidden = true;
  }

  document.querySelectorAll('[data-abrir-regalo]').forEach((boton) => {
    boton.addEventListener('click', () => {
      mostrarFormulario();
      dlg.showModal();
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = Number(form.querySelector('input[name="valor"]:checked').value);
    const para = document.getElementById('rg-para').value.trim();
    const mensaje = document.getElementById('rg-mensaje').value.trim();
    const de = document.getElementById('rg-de').value.trim();

    codigoActual = generarCodigo();
    document.getElementById('gc-valor').textContent = '$' + valor.toLocaleString('es-CL');
    document.getElementById('gc-para').textContent = 'Para: ' + para;
    document.getElementById('gc-msg').textContent = mensaje || 'Con cariño';
    document.getElementById('gc-de').textContent = 'De: ' + de;
    document.getElementById('gc-codigo').textContent = codigoActual;

    form.hidden = true;
    resultado.hidden = false;
  });

  document.getElementById('btn-copiar').addEventListener('click', (e) => {
    const boton = e.currentTarget;
    const copiado = () => {
      boton.textContent = 'Copiado ✓';
      setTimeout(() => { boton.textContent = 'Copiar código'; }, 1500);
    };
    try {
      navigator.clipboard.writeText(codigoActual).then(copiado).catch(() => { /* sin permiso de portapapeles */ });
    } catch (err) { /* navegador sin clipboard */ }
  });

  document.getElementById('btn-otra').addEventListener('click', () => {
    form.reset();
    mostrarFormulario();
  });
})();
