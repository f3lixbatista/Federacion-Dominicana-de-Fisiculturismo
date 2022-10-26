const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categoriaSchema = new Schema({
    Categoria: String,
    Open: Boolean,
    Sexo: String,
    Edad: Number,
    Peso: Number,
    Estatura: Number
})


// crear modelo
const Categoria = mongoose.model('Categoria', categoriaSchema);


module.exports = Categoria;


