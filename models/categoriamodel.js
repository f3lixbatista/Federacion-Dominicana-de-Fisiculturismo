const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categoriaSchema = new Schema({
    Categoria: String,
    Modalidad: String,
    Genero: String,
    Disciplina: String,
    Division: String,
    DesdeEdad: Number,
    HastaEdad: Number,
    DesdePeso: Number,
    HastaPeso: Number,
    DesdeEstatura: Number,
    HastaEstatura: Number
})


// crear modelo
const Categoria = mongoose.model('Categoria', categoriaSchema);


module.exports = Categoria;


