// Enlace entre los formularios de FDFF (Bootstrap + EJS) y el lector de documentos con cámara
// (public/js/camara). Cada pantalla solo declara qué botón abre la cámara, de qué tipo es el
// documento y a qué campos va cada dato:
//
//   <script type="module">
//     import { conectarLectorDocumento } from '/js/lector-fdff.js';
//     conectarLectorDocumento({
//       boton: '#btnLeerCedula', avisoEn: '#avisoLector', tipo: 'cedula', titulo: 'Cédula del atleta',
//       mapa: { nombre_completo: '#nombre', cedula: '#cedula' },
//     });
//   </script>
//
// La lectura es solo un borrador: rellena los campos y la persona revisa antes de guardar.
import { leerDocumentoConCamara, rellenarCampos } from '/js/camara/lectorDocumentoCliente.js';

export const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

// `alLeer({ datos, advertencias, campos })` puede devolver `{ mensaje, nivel }` para reemplazar el aviso
// por defecto (nivel: success | warning | danger | info).
export function conectarLectorDocumento({ boton, avisoEn, tipo = 'cedula', titulo, mapa = {}, alLeer }) {
  const btn = typeof boton === 'string' ? document.querySelector(boton) : boton;
  if (!btn) return;

  const mostrar = (mensaje, nivel) => {
    const destino = typeof avisoEn === 'string' ? document.querySelector(avisoEn) : avisoEn;
    if (!destino) return;
    destino.className = `alert alert-${nivel} py-2 px-3 small mt-2 mb-0`;
    destino.textContent = mensaje;
  };

  btn.addEventListener('click', () => {
    leerDocumentoConCamara({
      tipo,
      url: '/documentos',
      titulo,
      alFotos: () => mostrar('Leyendo el documento…', 'info'),
      alLeer: ({ datos, advertencias }) => {
        const campos = rellenarCampos(datos, mapa);
        const personalizado = alLeer?.({ datos, advertencias, campos });
        if (personalizado) return mostrar(personalizado.mensaje, personalizado.nivel || 'info');
        if (advertencias?.length) mostrar(advertencias.join(' '), 'warning');
        else mostrar('Documento leído. Revisa los datos antes de guardar.', 'success');
      },
      alError: (err) => mostrar(err.message, 'danger'),
    });
  });
}
