import { soportaCamara, listarCamaras, abrirCamara, detenerCamara, mensajeErrorCamara, capturarFotograma } from './camaraCore.js';

// Ventana de cámara lista para usar en cualquier página: vista en vivo, selector de cámaras (equipo,
// USB, teléfono expuesto como webcam), captura de varias páginas y devolución de los JPEG. Se
// construye con DOM puro y sus propios estilos (clases `cl-`), así que funciona igual dentro de React
// que en una página EJS/HTML sin framework ni Bootstrap. Colores ajustables con variables CSS:
// --cl-acento y --cl-ok en :root.
//
//   const ventana = abrirCamaraLector({
//     titulo: 'Cédula del atleta',
//     onUsar: (archivos) => { /* File[] en JPEG */ },
//     onCerrar: () => { /* cerrada sin usar */ },
//   });
//   ventana.cerrar();   // opcional, cierra por código

const CLAVE_CAMARA = 'camaraLectorDeviceId';
const ID_ESTILOS = 'cl-estilos';

const ESTILOS = `
.cl-fondo{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.72);backdrop-filter:blur(4px);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.cl-caja{position:relative;width:100%;max-width:680px;max-height:95vh;overflow-y:auto;background:#fff;border-radius:28px;padding:28px;box-shadow:0 25px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:14px;box-sizing:border-box}
.cl-titulo{margin:0;font-size:22px;font-weight:900;letter-spacing:-.02em;text-transform:uppercase;color:#0f172a;padding-right:36px}
.cl-sub{margin:2px 0 0;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8}
.cl-cerrar{position:absolute;top:18px;right:20px;border:0;background:none;font-size:26px;line-height:1;color:#cbd5e1;cursor:pointer}
.cl-cerrar:hover{color:#ef4444}
.cl-select{width:100%;padding:11px 12px;border:0;border-radius:12px;background:#f8fafc;box-shadow:inset 0 0 0 1px #e2e8f0;font:700 14px inherit;color:#0f172a}
.cl-visor{position:relative;aspect-ratio:16/9;background:#0f172a;border-radius:16px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.cl-video{width:100%;height:100%;object-fit:contain}
.cl-estado{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-size:13px;font-weight:700;color:#cbd5e1}
.cl-estado.cl-error{color:#fecaca;font-size:14px}
.cl-btn{width:100%;padding:15px;border:0;border-radius:20px;font:900 14px inherit;letter-spacing:.02em;text-transform:uppercase;color:#fff;cursor:pointer;transition:transform .1s,background .15s}
.cl-btn:active:not(:disabled){transform:scale(.97)}
.cl-btn:disabled{background:#cbd5e1!important;cursor:not-allowed}
.cl-capturar{background:var(--cl-acento,#4f46e5)}
.cl-usar{background:var(--cl-ok,#059669)}
.cl-tira{display:flex;gap:8px;overflow-x:auto;padding:4px 2px}
.cl-mini{position:relative;flex:0 0 auto}
.cl-mini img{height:80px;border-radius:12px;box-shadow:0 0 0 1px #e2e8f0;display:block}
.cl-quitar{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border:0;border-radius:50%;background:#fff;color:#ef4444;font-size:14px;line-height:1;cursor:pointer;box-shadow:0 0 0 1px #e2e8f0}
`;

const inyectarEstilos = () => {
  if (document.getElementById(ID_ESTILOS)) return;
  const estilo = document.createElement('style');
  estilo.id = ID_ESTILOS;
  estilo.textContent = ESTILOS;
  document.head.appendChild(estilo);
};

const el = (etiqueta, clase, propiedades = {}, texto) => {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  Object.assign(nodo, propiedades);
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
};

const leerGuardada = () => { try { return localStorage.getItem(CLAVE_CAMARA) || ''; } catch { return ''; } };
const guardar = (id) => { try { id ? localStorage.setItem(CLAVE_CAMARA, id) : localStorage.removeItem(CLAVE_CAMARA); } catch { /* modo privado */ } };

export function abrirCamaraLector({
  titulo = 'Cámara',
  subtitulo = 'Encuadra el documento completo, con buena luz, y captura cada página',
  maxFotos = 10,
  onUsar,
  onCerrar,
} = {}) {
  inyectarEstilos();

  const previo = document.activeElement;
  const fondo = el('div', 'cl-fondo', { role: 'dialog' });
  fondo.setAttribute('aria-modal', 'true');
  fondo.setAttribute('aria-label', titulo);
  const caja = el('div', 'cl-caja');
  const cerrarBtn = el('button', 'cl-cerrar', { type: 'button', textContent: '×' });
  cerrarBtn.setAttribute('aria-label', 'Cerrar');
  const cabecera = el('div');
  cabecera.append(el('h3', 'cl-titulo', {}, titulo), el('p', 'cl-sub', {}, subtitulo));
  const select = el('select', 'cl-select');
  select.style.display = 'none';
  select.setAttribute('aria-label', 'Cámara');
  const visor = el('div', 'cl-visor');
  const video = el('video', 'cl-video', { playsInline: true, muted: true });
  const estado = el('div', 'cl-estado', {}, 'Abriendo cámara…');
  visor.append(video, estado);
  const capturarBtn = el('button', 'cl-btn cl-capturar', { type: 'button', disabled: true }, 'Capturar');
  const tira = el('div', 'cl-tira');
  tira.style.display = 'none';
  const usarBtn = el('button', 'cl-btn cl-usar', { type: 'button', disabled: true }, 'Usar fotos');
  caja.append(cerrarBtn, cabecera, select, visor, capturarBtn, tira, usarBtn);
  fondo.appendChild(caja);

  let cerrado = false;
  let stream = null;
  let elegida = leerGuardada();
  let intento = 0;
  const capturas = [];

  const mostrarEstado = (texto, error = false) => {
    estado.textContent = texto;
    estado.className = error ? 'cl-estado cl-error' : 'cl-estado';
    estado.style.display = texto ? 'flex' : 'none';
  };

  const refrescarLista = async (activaId = '') => {
    try {
      const camaras = await listarCamaras();
      if (cerrado) return;
      select.replaceChildren(...camaras.map((c, i) => {
        const opcion = el('option', '', { value: c.deviceId }, c.label || `Cámara ${i + 1}`);
        opcion.selected = c.deviceId === activaId;
        return opcion;
      }));
      select.style.display = camaras.length > 1 ? 'block' : 'none';
    } catch { /* la lista es solo comodidad */ }
  };

  const iniciar = async () => {
    const miIntento = ++intento;
    detenerCamara(stream);
    stream = null;
    capturarBtn.disabled = true;
    if (!soportaCamara()) {
      mostrarEstado('Este navegador no permite usar la cámara en esta conexión (hace falta https).', true);
      return;
    }
    mostrarEstado('Abriendo cámara…');
    try {
      const abierta = await abrirCamara(video, { deviceId: elegida });
      if (cerrado || miIntento !== intento) { detenerCamara(abierta.stream); return; }
      stream = abierta.stream;
      mostrarEstado('');
      capturarBtn.disabled = false;
      refrescarLista(abierta.deviceId);
    } catch (err) {
      if (cerrado || miIntento !== intento) return;
      if (err.name === 'OverconstrainedError' && elegida) {
        // La cámara guardada ya no está conectada: se vuelve a la predeterminada.
        elegida = '';
        guardar('');
        return iniciar();
      }
      mostrarEstado(mensajeErrorCamara(err), true);
    }
  };

  const pintarCapturas = () => {
    tira.replaceChildren(...capturas.map((c, i) => {
      const mini = el('div', 'cl-mini');
      const quitar = el('button', 'cl-quitar', { type: 'button', textContent: '×' });
      quitar.setAttribute('aria-label', `Quitar captura ${i + 1}`);
      quitar.onclick = () => {
        URL.revokeObjectURL(c.url);
        capturas.splice(capturas.indexOf(c), 1);
        pintarCapturas();
      };
      mini.append(el('img', '', { src: c.url, alt: `Captura ${i + 1}` }), quitar);
      return mini;
    }));
    tira.style.display = capturas.length ? 'flex' : 'none';
    usarBtn.disabled = capturas.length === 0;
    usarBtn.textContent = capturas.length ? `Usar ${capturas.length} foto${capturas.length === 1 ? '' : 's'}` : 'Usar fotos';
  };

  const cerrar = ({ notificar = true } = {}) => {
    if (cerrado) return;
    cerrado = true;
    intento++;
    detenerCamara(stream);
    stream = null;
    capturas.forEach((c) => URL.revokeObjectURL(c.url));
    navigator.mediaDevices?.removeEventListener?.('devicechange', alCambiarDispositivos);
    document.removeEventListener('keydown', alTeclear, true);
    fondo.remove();
    previo?.focus?.();
    if (notificar) onCerrar?.();
  };

  // Cerrar a propósito descarta lo capturado; se confirma para no perder páginas por un clic suelto.
  const pedirCierre = () => {
    if (capturas.length && !window.confirm(`Hay ${capturas.length} foto${capturas.length === 1 ? '' : 's'} sin usar. ¿Cerrar y descartarla${capturas.length === 1 ? '' : 's'}?`)) return;
    cerrar();
  };

  const alCambiarDispositivos = () => { refrescarLista(select.value); };
  const alTeclear = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); pedirCierre(); }
  };

  capturarBtn.onclick = async () => {
    if (!stream || !video.videoWidth) return;
    if (capturas.length >= maxFotos) { mostrarEstado(`Máximo ${maxFotos} fotos por lectura.`, true); return; }
    capturarBtn.disabled = true;
    try {
      const file = await capturarFotograma(video);
      capturas.push({ file, url: URL.createObjectURL(file) });
      pintarCapturas();
    } catch (err) {
      mostrarEstado(err.message || 'No se pudo capturar la imagen.', true);
    } finally {
      capturarBtn.disabled = !stream;
    }
  };
  usarBtn.onclick = () => {
    const archivos = capturas.map((c) => c.file);
    cerrar({ notificar: false });
    onUsar?.(archivos);
  };
  select.onchange = () => { elegida = select.value; guardar(elegida); iniciar(); };
  cerrarBtn.onclick = pedirCierre;

  document.body.appendChild(fondo);
  document.addEventListener('keydown', alTeclear, true);
  navigator.mediaDevices?.addEventListener?.('devicechange', alCambiarDispositivos);
  caja.tabIndex = -1;
  caja.focus();
  iniciar();

  return { cerrar: () => cerrar() };
}
