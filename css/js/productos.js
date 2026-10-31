/* Datos de ejemplo del catálogo.
   Los precios, materiales y existencias son referenciales (proyecto académico). */

const TIENDAS = [
  { id: 'vivo',    nombre: 'Vivo Los Trapenses',       direccion: 'Mall Vivo Los Trapenses' },
  { id: 'mut',     nombre: 'MUT',                      direccion: 'Mercado Urbano Tobalaba' },
  { id: 'dehesa',  nombre: 'Espacio Urbano La Dehesa', direccion: 'Espacio Urbano La Dehesa' },
  { id: 'pueblo',  nombre: 'Pueblo del Inglés',        direccion: 'Pueblo del Inglés, local' }
];

const CATEGORIAS = [
  { id: 'aros',       nombre: 'Aros',       icono: '◯' },
  { id: 'collares',   nombre: 'Collares',   icono: '◇' },
  { id: 'anillos',    nombre: 'Anillos',    icono: '◆' },
  { id: 'pulseras',   nombre: 'Pulseras',   icono: '∞' },
  { id: 'esclavas',   nombre: 'Esclavas',   icono: '○' },
  { id: 'charms',     nombre: 'Charms',     icono: '✦' },
  { id: 'brazaletes', nombre: 'Brazaletes', icono: '▭' }
];

const ETIQUETAS = {
  novedad: 'Novedad',
  destacado: 'Destacado',
  navidad: 'Navidad',
  'san-valentin': 'San Valentín'
};

/* stock: unidades disponibles por tienda (0 = agotado, 1-2 = últimas unidades, 3+ = disponible) */
const PRODUCTOS = [
  { id: 'aro-perla', nombre: 'Aros perla dorada', categoria: 'aros', material: 'Enchape oro 18k', precio: 18990,
    etiquetas: ['novedad'], descripcion: 'Aros con perla sintética y baño de oro 18k sobre base libre de níquel. Ligeros, para uso diario.',
    stock: { vivo: 4, mut: 0, dehesa: 2, pueblo: 6 } },
  { id: 'aro-argolla', nombre: 'Aros argolla mediana', categoria: 'aros', material: 'Plata 925', precio: 16990,
    etiquetas: ['destacado'], descripcion: 'Argolla mediana en plata 925, con cierre de seguridad.',
    stock: { vivo: 3, mut: 5, dehesa: 0, pueblo: 1 } },
  { id: 'aro-piedra', nombre: 'Aros piedra natural', categoria: 'aros', material: 'Piedra natural', precio: 14990,
    etiquetas: [], descripcion: 'Aros con piedra natural engarzada en metal dorado.',
    stock: { vivo: 0, mut: 2, dehesa: 4, pueblo: 0 } },

  { id: 'collar-cristal', nombre: 'Collar cristal', categoria: 'collares', material: 'Gold filled', precio: 21990,
    etiquetas: ['destacado'], descripcion: 'Cadena gold filled con cristal facetado. Gold filled tiene más capa de oro que el enchape.',
    stock: { vivo: 2, mut: 3, dehesa: 1, pueblo: 0 } },
  { id: 'collar-perla', nombre: 'Collar de perlas', categoria: 'collares', material: 'Enchape oro 18k', precio: 19990,
    etiquetas: ['navidad'], descripcion: 'Collar corto con perlas y cierre dorado. Un regalo clásico para la temporada.',
    stock: { vivo: 5, mut: 1, dehesa: 3, pueblo: 2 } },
  { id: 'collar-capa', nombre: 'Collar capa', categoria: 'collares', material: 'Plata 925', precio: 26990,
    etiquetas: [], descripcion: 'Collar de capas finas en plata 925.',
    stock: { vivo: 0, mut: 0, dehesa: 2, pueblo: 1 } },

  { id: 'anillo-piedra', nombre: 'Anillo piedra natural', categoria: 'anillos', material: 'Plata 925', precio: 15990,
    etiquetas: ['novedad'], descripcion: 'Anillo en plata 925 con piedra natural. Disponible en varias tallas.',
    stock: { vivo: 3, mut: 0, dehesa: 4, pueblo: 2 } },
  { id: 'anillo-liso', nombre: 'Anillo liso', categoria: 'anillos', material: 'Enchape oro 18k', precio: 12990,
    etiquetas: [], descripcion: 'Anillo liso con baño de oro 18k, de uso diario.',
    stock: { vivo: 6, mut: 4, dehesa: 0, pueblo: 3 } },

  { id: 'pulsera-cadena', nombre: 'Pulsera cadena', categoria: 'pulseras', material: 'Plata 925', precio: 17990,
    etiquetas: [], descripcion: 'Pulsera de cadena fina en plata 925 con broche de seguridad.',
    stock: { vivo: 2, mut: 2, dehesa: 1, pueblo: 0 } },
  { id: 'pulsera-piedra', nombre: 'Pulsera de piedras', categoria: 'pulseras', material: 'Piedra natural', precio: 15990,
    etiquetas: ['destacado'], descripcion: 'Pulsera elástica con piedras naturales. Cada pieza es levemente distinta.',
    stock: { vivo: 4, mut: 6, dehesa: 2, pueblo: 3 } },

  { id: 'esclava-lisa', nombre: 'Esclava lisa', categoria: 'esclavas', material: 'Plata 925', precio: 24990,
    etiquetas: ['destacado'], descripcion: 'Esclava lisa en plata 925. Combina bien con otras esclavas para armar un conjunto.',
    stock: { vivo: 1, mut: 3, dehesa: 0, pueblo: 2 } },
  { id: 'esclava-dorada', nombre: 'Esclava dorada', categoria: 'esclavas', material: 'Enchape oro 18k', precio: 22990,
    etiquetas: ['novedad'], descripcion: 'Esclava con baño de oro 18k y acabado pulido.',
    stock: { vivo: 3, mut: 0, dehesa: 2, pueblo: 1 } },

  { id: 'charm-luna', nombre: 'Charm luna', categoria: 'charms', material: 'Plata 925', precio: 13990,
    etiquetas: [], descripcion: 'Charm de luna en plata 925, para pulseras o collares.',
    stock: { vivo: 5, mut: 2, dehesa: 3, pueblo: 4 } },
  { id: 'charm-corazon', nombre: 'Charm corazón', categoria: 'charms', material: 'Gold filled', precio: 12990,
    etiquetas: ['san-valentin'], descripcion: 'Charm de corazón en gold filled. Ideal para regalar.',
    stock: { vivo: 0, mut: 1, dehesa: 2, pueblo: 0 } },

  { id: 'brazalete-ancho', nombre: 'Brazalete ancho', categoria: 'brazaletes', material: 'Enchape oro 18k', precio: 27990,
    etiquetas: ['navidad'], descripcion: 'Brazalete rígido ancho con baño de oro 18k.',
    stock: { vivo: 2, mut: 1, dehesa: 0, pueblo: 2 } }
];

const ICONOS = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.icono]));
