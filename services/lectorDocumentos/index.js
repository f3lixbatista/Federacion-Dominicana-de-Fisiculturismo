// Lector de documentos con IA (cédula y pasaporte hoy). Autocontenido: no importa nada del resto del
// proyecto, así que la carpeta entera se puede copiar a otro proyecto Express (CommonJS, Node 20+).
// Dependencias: express, multer y @anthropic-ai/sdk. Variables: ANTHROPIC_API_KEY y, opcional,
// LECTOR_MODELO.
const { TIPOS } = require('./tipos');
const { leerDocumento, ErrorLectura } = require('./leerDocumento');
const { crearRouterLecturaDocumentos } = require('./router');
const { soloDigitos, formatearCedula, cedulaRDValida } = require('./cedulaRD');

module.exports = { TIPOS, leerDocumento, ErrorLectura, crearRouterLecturaDocumentos, soloDigitos, formatearCedula, cedulaRDValida };
