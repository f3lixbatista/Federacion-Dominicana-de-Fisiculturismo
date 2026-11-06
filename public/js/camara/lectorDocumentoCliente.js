import { abrirCamaraLector } from './camaraUI.js';

// Lado navegador del lector de documentos: manda las fotos al endpoint del servidor
// (backend/src/services/lectorDocumentos), rellena campos de un formulario con lo leído y junta todo
// en una sola llamada para páginas sin framework. Sin dependencias.
//
//   leerDocumentoConCamara({
//     tipo: 'cedula',
//     url: '/documentos',                       // el servidor expone POST /documentos/cedula
//     titulo: 'Cédula del atleta',
//     alFotos: (archivos) => { /* guardar la foto como adjunto si hace falta */ },
//     alLeer: ({ datos, advertencias }) => rellenarCampos(datos, {
//       nombre_completo: '#nombre', cedula: '#cedula', fecha_nacimiento: '#fecha_nacimiento',
//     }),
//     alError: (err) => alert(err.message),
//   });

export class ErrorLecturaDocumento extends Error {
  constructor(mensaje, { sinConexion = false, estado = null } = {}) {
    super(mensaje);
    this.sinConexion = sinConexion;
    this.estado = estado;
  }
}

export async function enviarDocumento({ url, archivos, headers = {}, credentials = 'same-origin', fetchFn = (...args) => fetch(...args) }) {
  const form = new FormData();
  archivos.forEach((archivo) => form.append('foto', archivo));

  let respuesta;
  try {
    respuesta = await fetchFn(url, { method: 'POST', body: form, headers, credentials });
  } catch {
    throw new ErrorLecturaDocumento('No hay conexión con el servidor: digita los datos a mano.', { sinConexion: true });
  }
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorLecturaDocumento(cuerpo?.error || 'No se pudo leer el documento. Digita los datos a mano.', { estado: respuesta.status });
  }
  // Una sesión vencida suele responder 200 con la página de login en vez de JSON.
  if (!cuerpo) throw new ErrorLecturaDocumento('Tu sesión expiró. Inicia sesión de nuevo y vuelve a intentar.', { estado: respuesta.status });
  return cuerpo;
}

// Escribe en cada campo el dato leído y dispara `input` y `change` para que cualquier validación o
// librería de la página se entere. Los datos nulos no tocan el campo. Devuelve los campos rellenados.
// Cada entrada del mapa es un selector o `{ selector, formato }`; `formato(valor)` adapta el dato al
// campo (p. ej. quitar los guiones de la cédula en un <input type="number">).
export function rellenarCampos(datos, mapa, raiz = document) {
  const rellenados = [];
  for (const [campo, destino] of Object.entries(mapa)) {
    const valor = datos?.[campo];
    if (valor == null || valor === '') continue;
    const { selector, formato } = typeof destino === 'string' ? { selector: destino } : destino;
    const nodo = raiz.querySelector(selector);
    if (!nodo) continue;
    nodo.value = String(formato ? formato(valor) : valor);
    nodo.dispatchEvent(new Event('input', { bubbles: true }));
    nodo.dispatchEvent(new Event('change', { bubbles: true }));
    rellenados.push(campo);
  }
  return rellenados;
}

export function leerDocumentoConCamara({
  tipo,
  url,
  titulo,
  headers,
  credentials,
  fetchFn,
  alFotos,
  alLeer,
  alError,
  alCerrar,
  ...opcionesVentana
}) {
  return abrirCamaraLector({
    titulo,
    ...opcionesVentana,
    onCerrar: alCerrar,
    onUsar: async (archivos) => {
      alFotos?.(archivos);
      try {
        const resultado = await enviarDocumento({ url: `${url.replace(/\/$/, '')}/${tipo}`, archivos, headers, credentials, fetchFn });
        alLeer?.(resultado, archivos);
      } catch (err) {
        alError?.(err, archivos);
      }
    },
  });
}
