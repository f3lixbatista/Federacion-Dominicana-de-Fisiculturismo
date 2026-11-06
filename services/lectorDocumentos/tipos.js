const { soloDigitos, formatearCedula, cedulaRDValida } = require('./cedulaRD');

// Cada tipo de documento define qué se le pide a la IA y cómo se limpia lo que devuelve. Para
// soportar otro documento (licencia, acta de nacimiento…) basta con añadir una entrada aquí.

const texto = (valor) => {
  if (typeof valor !== 'string') return null;
  const limpio = valor.replace(/\s+/g, ' ').trim();
  return limpio || null;
};

const fecha = (valor) => {
  const t = texto(valor);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t ? null : t;
};

const sexo = (valor) => {
  const t = texto(valor)?.toUpperCase();
  return t === 'M' || t === 'F' ? t : null;
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

const avisoFechas = (datos, advertencias) => {
  if (datos.fecha_nacimiento && (datos.fecha_nacimiento < '1900-01-01' || datos.fecha_nacimiento > hoyISO())) {
    advertencias.push('La fecha de nacimiento leída no es posible: revísala.');
    datos.fecha_nacimiento = null;
  }
  if (datos.fecha_expiracion && datos.fecha_expiracion < hoyISO()) {
    advertencias.push('El documento aparece vencido.');
  }
};

const nombreCompleto = (nombres, apellidos) => texto([nombres, apellidos].filter(Boolean).join(' '));

const PROMPT_CEDULA = `Esta imagen es una cédula de identidad y electoral de la República Dominicana, fotografiada con una cámara. Puede mostrar el frente, el reverso o ambos. Extrae los datos que se vean con claridad.

Devuelve EXCLUSIVAMENTE un JSON, sin texto antes ni después ni bloque de código, con este formato exacto:
{
  "nombres": "<nombres de pila, o null>",
  "apellidos": "<apellidos, o null>",
  "cedula": "<número de cédula de 11 dígitos, con o sin guiones, o null>",
  "fecha_nacimiento": "<YYYY-MM-DD, o null>",
  "sexo": "<'M' o 'F', o null>",
  "nacionalidad": "<o null>",
  "estado_civil": "<o null>",
  "lugar_nacimiento": "<o null>",
  "tipo_sangre": "<ej. 'O+', o null>",
  "fecha_expiracion": "<YYYY-MM-DD, o null>"
}

Reglas:
- Si un dato no se puede leer con confianza razonable, usa null. No adivines ni completes dígitos.
- Copia los nombres y apellidos tal como están impresos, sin cambiar la ortografía.
- El número de cédula debe tener exactamente 11 dígitos; si ves menos o más, o dudas de alguno, usa null.`;

const PROMPT_PASAPORTE = `Esta imagen es la página de datos de un pasaporte, fotografiada con una cámara. Extrae los datos que se vean con claridad; si la zona legible por máquina (las dos líneas de "<<<" al pie) es visible, úsala para confirmar el número, las fechas y el sexo.

Devuelve EXCLUSIVAMENTE un JSON, sin texto antes ni después ni bloque de código, con este formato exacto:
{
  "nombres": "<nombres de pila, o null>",
  "apellidos": "<apellidos, o null>",
  "numero_pasaporte": "<o null>",
  "nacionalidad": "<país, o null>",
  "pais_emisor": "<país que lo emite, o null>",
  "fecha_nacimiento": "<YYYY-MM-DD, o null>",
  "sexo": "<'M' o 'F', o null>",
  "fecha_expiracion": "<YYYY-MM-DD, o null>"
}

Reglas:
- Si un dato no se puede leer con confianza razonable, usa null. No adivines.
- Copia los nombres tal como están impresos.
- Las fechas siempre en formato YYYY-MM-DD.`;

const TIPOS = {
  cedula: {
    etiqueta: 'Cédula de identidad dominicana',
    prompt: PROMPT_CEDULA,
    normalizar(crudo) {
      const advertencias = [];
      const digitos = soloDigitos(crudo.cedula);
      const datos = {
        nombres: texto(crudo.nombres),
        apellidos: texto(crudo.apellidos),
        cedula: null,
        cedula_valida: false,
        fecha_nacimiento: fecha(crudo.fecha_nacimiento),
        sexo: sexo(crudo.sexo),
        nacionalidad: texto(crudo.nacionalidad),
        estado_civil: texto(crudo.estado_civil),
        lugar_nacimiento: texto(crudo.lugar_nacimiento),
        tipo_sangre: texto(crudo.tipo_sangre)?.toUpperCase() ?? null,
        fecha_expiracion: fecha(crudo.fecha_expiracion),
      };
      datos.nombre_completo = nombreCompleto(datos.nombres, datos.apellidos);

      if (digitos.length === 11) {
        datos.cedula = formatearCedula(digitos);
        datos.cedula_valida = cedulaRDValida(digitos);
        if (!datos.cedula_valida) advertencias.push('El dígito verificador de la cédula no coincide: revisa los números contra el documento.');
      } else if (digitos.length > 0) {
        advertencias.push('El número de cédula se leyó incompleto: digítalo a mano.');
      } else {
        advertencias.push('No se pudo leer el número de cédula: digítalo a mano.');
      }
      avisoFechas(datos, advertencias);
      return { datos, advertencias };
    },
  },

  pasaporte: {
    etiqueta: 'Pasaporte',
    prompt: PROMPT_PASAPORTE,
    normalizar(crudo) {
      const advertencias = [];
      const numero = texto(crudo.numero_pasaporte)?.toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
      const datos = {
        nombres: texto(crudo.nombres),
        apellidos: texto(crudo.apellidos),
        numero_pasaporte: numero,
        nacionalidad: texto(crudo.nacionalidad),
        pais_emisor: texto(crudo.pais_emisor),
        fecha_nacimiento: fecha(crudo.fecha_nacimiento),
        sexo: sexo(crudo.sexo),
        fecha_expiracion: fecha(crudo.fecha_expiracion),
      };
      datos.nombre_completo = nombreCompleto(datos.nombres, datos.apellidos);
      if (!numero) advertencias.push('No se pudo leer el número de pasaporte: digítalo a mano.');
      avisoFechas(datos, advertencias);
      return { datos, advertencias };
    },
  },
};

module.exports = { TIPOS };
