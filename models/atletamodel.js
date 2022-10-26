const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const atletaSchema = new Schema({
    IDFDFF: Number,
    FechaInscripcion: Date,
    Nombre: String,
    Cedula: Number,
    Pasaporte: String,
    Nacionalidad: String,
    Nacimiento: Date,
    Sexo: String,
    Ocupacion: String,
    Calle: String,
    Sector: String,
    Municipio: String,
    Provincia: String,
    Pais: String,
    Postal: Number,
    Celular: Number,
    TelFijo: Number,
    Email: String,
    Instagram: String,
    Categoria: String,
    Estatura: Number,
    Peso: Number,
    Gimnasio: String,
    Preparador: String,
    CelPreparador: Number,
    EmailPreparador: String
})

// crear modelo
const Atleta = mongoose.model('Atleta', atletaSchema);

module.exports = Atleta;


