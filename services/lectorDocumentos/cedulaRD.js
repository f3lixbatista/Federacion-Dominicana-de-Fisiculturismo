const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

const formatearCedula = (digitos) => `${digitos.slice(0, 3)}-${digitos.slice(3, 10)}-${digitos.slice(10)}`;

// Dígito verificador de la cédula dominicana (módulo 10 con pesos 1,2,1,2…). Atrapa casi cualquier
// dígito mal leído por la cámara, y funciona sin conexión.
const cedulaRDValida = (digitos) => {
  if (!/^\d{11}$/.test(digitos)) return false;
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    const producto = Number(digitos[i]) * (i % 2 === 0 ? 1 : 2);
    suma += producto > 9 ? producto - 9 : producto;
  }
  return (10 - (suma % 10)) % 10 === Number(digitos[10]);
};

module.exports = { soloDigitos, formatearCedula, cedulaRDValida };
