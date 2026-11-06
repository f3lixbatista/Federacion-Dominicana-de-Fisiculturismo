const { TIPOS } = require('./tipos');

const FORMATOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MODELO_POR_DEFECTO = 'claude-sonnet-5-5';

class ErrorLectura extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

const MAX_IMAGENES = 4;

// Lee un documento con Claude vision y devuelve los datos ya limpios. `imagenes` son las fotos del
// mismo documento (p. ej. frente y reverso de la cédula) y se leen en una sola llamada. Nunca guarda
// nada: el llamador decide qué hacer con el borrador. `cliente` permite inyectar un doble en las
// pruebas.
async function leerDocumento({ imagenes, tipo, apiKey = process.env.ANTHROPIC_API_KEY, modelo, cliente }) {
  const definicion = TIPOS[tipo];
  if (!definicion) throw new ErrorLectura(400, 'Tipo de documento no soportado.');
  if (!Array.isArray(imagenes) || imagenes.length === 0) throw new ErrorLectura(400, 'Falta la foto a leer.');
  if (imagenes.length > MAX_IMAGENES) throw new ErrorLectura(400, `Máximo ${MAX_IMAGENES} fotos por documento.`);
  if (imagenes.some((i) => !FORMATOS_IMAGEN.includes(i.mimetype))) throw new ErrorLectura(415, 'Formato de imagen no soportado: usa JPG, PNG o WEBP.');
  if (!cliente && !apiKey) throw new ErrorLectura(503, 'La lectura de documentos no está configurada en este servidor. Digita los datos a mano.');

  const ia = cliente || new (require('@anthropic-ai/sdk'))({ apiKey });
  const respuesta = await ia.messages.create({
    model: modelo || process.env.LECTOR_MODELO || MODELO_POR_DEFECTO,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        ...imagenes.map((i) => ({ type: 'image', source: { type: 'base64', media_type: i.mimetype, data: i.buffer.toString('base64') } })),
        { type: 'text', text: imagenes.length > 1 ? `${definicion.prompt}\n\nLas ${imagenes.length} imágenes son fotos del mismo documento (por ejemplo, frente y reverso): combina lo que se vea en todas.` : definicion.prompt },
      ],
    }],
  });

  const salida = respuesta.content?.find((b) => b.type === 'text')?.text || '';
  const bloque = salida.match(/\{[\s\S]*\}/);
  if (!bloque) throw new ErrorLectura(502, 'No se pudo leer el documento: intenta con una foto más clara.');
  let crudo;
  try {
    crudo = JSON.parse(bloque[0]);
  } catch {
    throw new ErrorLectura(502, 'No se pudo leer el documento: intenta con una foto más clara.');
  }
  return { tipo, ...definicion.normalizar(crudo) };
}

module.exports = { leerDocumento, ErrorLectura, FORMATOS_IMAGEN, MAX_IMAGENES };
