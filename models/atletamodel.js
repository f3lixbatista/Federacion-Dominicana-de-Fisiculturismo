const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const atletaSchema = new Schema({
    Nombre: String,
    Categoria: String,
    IDFDFF: Number
})

// crear modelo
const Atleta = mongoose.model('Atleta', atletaSchema);

module.exports = Atleta;


