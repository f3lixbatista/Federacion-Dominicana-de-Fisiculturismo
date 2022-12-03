const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Eventos = require('../models/eventomodel')

//     Categoria: String,
//     Evento: String,
//     Modalidad: String,
//     Genero: String,
//     Disciplina: String,
//     Division: String,
//     DesdeEdad: Number,
//     HastaEdad: Number,
//     DesdePeso: Number,
//     HastaPeso: Number,
//     DesdeEstatura: Number,
//     HastaEstatura: Number, 
//     Salida: Number,
//     Competidor: [{
//         FechaActual: Date, 
//         IDFDFF: String,
//         Nombre: String,
//         Cedula: String,
//         Nacimiento: Date,
//         Edad: Number,
//         Sexo: String,
//         Peso: Number,
//         Estatura: Number, 
//         Sector: String,
//         Preparador: String,
//         EstadisticasEliminatoria: [{
//             J1: Number,
//             J2: Number,
//             J3: Number,
//             J4: Number,
//             J5: Number,
//             J6: Number,
//             J7: Number,
//             J8: Number,
//             J9: Number,
//             J10: Number,
//             J11: Number,
//             J12: Number,
//             J13: Number,
//             Total: Number,
//             Posicion: Number,
//         }],
//         EstadisticasSemiFinalR1: [{
//             J1: Number,
//             J2: Number,
//             J3: Number,
//             J4: Number,
//             J5: Number,
//             J6: Number,
//             J7: Number,
//             J8: Number,
//             J9: Number,
//             J10: Number,
//             J11: Number,
//             J12: Number,
//             J13: Number,
//             Total: Number,
//             Posicion: Number,
//         }],   
//         EstadisticasSemiFinalR2: [{
//             J1: Number,
//             J2: Number,
//             J3: Number,
//             J4: Number,
//             J5: Number,
//             J6: Number,
//             J7: Number,
//             J8: Number,
//             J9: Number,
//             J10: Number,
//             J11: Number,
//             J12: Number,
//             J13: Number,
//             Total: Number,
//             Posicion: Number,
//             TotalGralSem: Number,
//             PosicionGralSem: Number,
//         }], 
//         EstadisticasFinalR1: [{
//             J1: Number,
//             J2: Number,
//             J3: Number,
//             J4: Number,
//             J5: Number,
//             J6: Number,
//             J7: Number,
//             J8: Number,
//             J9: Number,
//             J10: Number,
//             J11: Number,
//             J12: Number,
//             J13: Number,
//             TotalR1: Number,
//             PosicionR1: Number,
//         }], 
//         EstadisticasFinalR2: [{
//             J1: Number,
//             J2: Number,
//             J3: Number,
//             J4: Number,
//             J5: Number,
//             J6: Number,
//             J7: Number,
//             J8: Number,
//             J9: Number,
//             J10: Number,
//             J11: Number,
//             J12: Number,
//             J13: Number,
//             TotalR2: Number,
//             PosicionR2: Number,
//             TotalGralFinal: Number,
//             PosicionGralFinal: Number,

//         }],
//         EstadisticasAbsoluto: [{
//             J1: Number,
//             J2: Number,
//             J3: Number,
//             J4: Number,
//             J5: Number,
//             J6: Number,
//             J7: Number,
//             J8: Number,
//             J9: Number,
//             J10: Number,
//             J11: Number,
//             J12: Number,
//             J13: Number,
//             Total: Number,
//             Posicion: Number,
            
//         }],
//     }]
// })

// Eventos = mongoose.model('mr. region norte 2022', EventoSchema);

router.get('/', async (req, res) => {
    
    try {  
        const arrCategoriaDB = await Eventos.find();
        // const arrayAtletaDB = await Atleta.find();
        // console.log(arrayAtletaDB)

        arrCategoriaDB.sort((o1, o2) => {
            if (o1.Salida < o2.Salida) {
                return -1;
            } else if (o1.Salida > o2.Salida) {
                return 1;
            } else {
                return 0;
            }
        });
        
        res.render('estadisticas', {
            // arrayAtletas: arrayAtletaDB,
            arrCategorias: arrCategoriaDB
            
        })
    
    } catch (error) {
        console.log(error)
    }

})

router.get('/:id', async (req, res) => {
        
    const id = req.params.id
     
    try {     

        const datosEvento = await Eventos.findOne({ _id: id })
        // console.log(atletaDB)
        
        res.render('calculos', {
            datos: datosEvento,
            error: false           
        })       
        
    } catch (error) {       
        res.render('calculos', { 
            error: true,
            mensaje:"no encontrado"
        })
    }
})

module.exports = router;