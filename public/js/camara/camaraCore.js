// Núcleo de la cámara lectora de documentos: abrir/cerrar la cámara, listar las disponibles y
// congelar un fotograma como JPEG. Sin dependencias ni nada del ERP — la carpeta lib/camara se
// copia tal cual a otro proyecto (ver camaraUI.js y lectorDocumentoCliente.js).

// Tamaño final de una imagen al reducirla para que su lado mayor no pase de `maxLado`, conservando la
// proporción. Nunca agranda una imagen que ya es más chica.
export function dimensionesReducidas(ancho, alto, maxLado = 800) {
  const mayor = Math.max(ancho, alto);
  if (!mayor || mayor <= maxLado) return { ancho, alto };
  const factor = maxLado / mayor;
  return { ancho: Math.round(ancho * factor), alto: Math.round(alto * factor) };
}

// getUserMedia solo existe en https (o localhost): fuera de eso la cámara no se puede abrir.
export function soportaCamara() {
  return typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
}

// Los nombres de las cámaras solo aparecen después de conceder el permiso, por eso se vuelve a
// listar tras abrir la primera.
export async function listarCamaras() {
  const dispositivos = await navigator.mediaDevices.enumerateDevices();
  return dispositivos.filter((d) => d.kind === 'videoinput');
}

const RESOLUCION_IDEAL = { width: { ideal: 1920 }, height: { ideal: 1080 } };

// Sin `deviceId` pide la cámara trasera (teléfonos) o la predeterminada (PC). Con un `deviceId` que
// ya no existe lanza OverconstrainedError: el llamador vuelve a la predeterminada.
export async function abrirCamara(video, { deviceId = '' } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: deviceId
      ? { deviceId: { exact: deviceId }, ...RESOLUCION_IDEAL }
      : { facingMode: { ideal: 'environment' }, ...RESOLUCION_IDEAL },
    audio: false,
  });
  video.srcObject = stream;
  await video.play().catch(() => {});
  return { stream, deviceId: stream.getVideoTracks()[0]?.getSettings().deviceId || '' };
}

export function detenerCamara(stream) {
  stream?.getTracks().forEach((t) => t.stop());
}

const MENSAJES_ERROR = {
  NotAllowedError: 'El navegador no tiene permiso para usar la cámara. Permítelo en el candado de la barra de direcciones y vuelve a intentar.',
  NotFoundError: 'No se encontró ninguna cámara conectada.',
  NotReadableError: 'La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.',
};

export function mensajeErrorCamara(err) {
  return MENSAJES_ERROR[err?.name] || `No se pudo abrir la cámara: ${err?.message || 'error desconocido'}`;
}

// Congela el fotograma actual de un <video> como JPEG. 1600 px de lado mayor basta para leer un
// documento: Claude reduce las imágenes por encima de ~1568 px, así que más resolución solo pesaría más.
export async function capturarFotograma(video, { maxLado = 1600, calidad = 0.85 } = {}) {
  const { ancho, alto } = dimensionesReducidas(video.videoWidth, video.videoHeight, maxLado);
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d').drawImage(video, 0, 0, ancho, alto);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', calidad));
  if (!blob) throw new Error('No se pudo capturar la imagen.');
  return new File([blob], `captura-${Date.now()}.jpg`, { type: 'image/jpeg' });
}
