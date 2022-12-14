const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CompetidorSchema = new Schema({
    FechaActual: Date, 
    IDFDFF: String,
    Nombre: String,
    Cedula: String,
    Nacimiento: Date,
    Edad: Number,
    Sexo: String,
    Peso: Number,
    Estatura: Number, 
    Sector: String,
    Numero: Number,
    Preparador: String,
    EstadisticasEliminatoria: [{
        J1: Number,
        J2: Number,
        J3: Number,
        J4: Number,
        J5: Number,
        J6: Number,
        J7: Number,
        J8: Number,
        J9: Number,
        J10: Number,
        J11: Number,
        J12: Number,
        J13: Number,
        Total: Number,
        Posicion: Number,
    }],
    EstadisticasSemiFinalR1: [{
        J1: Number,
        J2: Number,
        J3: Number,
        J4: Number,
        J5: Number,
        J6: Number,
        J7: Number,
        J8: Number,
        J9: Number,
        J10: Number,
        J11: Number,
        J12: Number,
        J13: Number,
        Total: Number,
        Posicion: Number,
    }],   
    EstadisticasSemiFinalR2: [{
        J1: Number,
        J2: Number,
        J3: Number,
        J4: Number,
        J5: Number,
        J6: Number,
        J7: Number,
        J8: Number,
        J9: Number,
        J10: Number,
        J11: Number,
        J12: Number,
        J13: Number,
        Total: Number,
        Posicion: Number,
        TotalGralSem: Number,
        PosicionGralSem: Number,
    }], 
    EstadisticasFinalR1: [{
        J1: Number,
        J2: Number,
        J3: Number,
        J4: Number,
        J5: Number,
        J6: Number,
        J7: Number,
        J8: Number,
        J9: Number,
        J10: Number,
        J11: Number,
        J12: Number,
        J13: Number,
        TotalR1: Number,
        PosicionR1: Number,
    }], 
    EstadisticasFinalR2: [{
        J1: Number,
        J2: Number,
        J3: Number,
        J4: Number,
        J5: Number,
        J6: Number,
        J7: Number,
        J8: Number,
        J9: Number,
        J10: Number,
        J11: Number,
        J12: Number,
        J13: Number,
        TotalR2: Number,
        PosicionR2: Number,
        TotalGralFinal: Number,
        PosicionGralFinal: Number,

    }],
    EstadisticasAbsoluto: [{
        J1: Number,
        J2: Number,
        J3: Number,
        J4: Number,
        J5: Number,
        J6: Number,
        J7: Number,
        J8: Number,
        J9: Number,
        J10: Number,
        J11: Number,
        J12: Number,
        J13: Number,
        Total: Number,
        Posicion: Number,
        
    }],


})

const EventoSchema = new Schema({
    Categoria: String,
    Evento: String,
    Modalidad: String,
    Genero: String,
    Disciplina: String,
    Division: String,
    DesdeEdad: Number,
    HastaEdad: Number,
    DesdePeso: Number,
    HastaPeso: Number,
    DesdeEstatura: Number,
    HastaEstatura: Number, 
    Salida: Number,
    Competidor: [CompetidorSchema]
       
})

Competidor = mongoose.model('Competidor', CompetidorSchema);
Eventos = mongoose.model('mr. region norte 2022', EventoSchema);


module.exports = Eventos, Competidor;