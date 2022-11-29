const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// const { db, collection } = require('../models/categoriamodel');
const Schema = mongoose.Schema;
const Atleta = require('../models/atletamodel')
const Categoria = require('../models/categoriamodel')

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
    Competidor: [{
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
    }]
})


Eventos = mongoose.model('mr. region norte 2022', EventoSchema);


router.get('/', async (req, res) => {

    try {  
        const arrayCategoriaDB = await Eventos.find();
        const arrayAtletaDB = await Atleta.find();
        // console.log(arrayAtletaDB)
        
        res.render("inscripcion", {
            arrayAtletas: arrayAtletaDB,
            arrayCategorias: arrayCategoriaDB
            
        })
    
    } catch (error) {
        console.log(error)
    }

})






router.get('/:id', async (req, res) => {
        
    const id = req.params.id

   
    // const Eventos = 'mr. region norte 2022'
     
    try {     

        const arrayCategoriaDB = await Eventos.find();
        // console.log(arrayCategoriaDB)

        const atletaDB = await Atleta.findOne({ _id: id })
        // console.log(atletaDB)
        
        res.render('detalleInscripcion', {
            atleta: atletaDB,
            arrayCategorias: arrayCategoriaDB,
            error: false           
        })       
        
    } catch (error) {       
        res.render('detalleInscripcion', { 
            error: true,
            mensaje:"no encontrado"
        })
    }
})



// router.get('/crear', (req, res) => {
//     res.render('crear')

// })

// router.post('/crear', async (req, res) => {
//     const body = req.body
//     // const {Pais} = req.body
//     // console.log(Pais)
//     console.log(body)
//     // const circular = db.circular
    
//     // const arrayAtletaDB = await Atleta.find();
//     //     console.log(arrayAtletaDB)


//     // const prueba = db.collections
//     // console.log(prueba)

//     // for (let cuerpo in prueba){  
//     //     console.log(cuerpo + " " + prueba[cuerpo]);
        

//     //  }

//     // try {
//     //     // const atletaDB = new Atleta(body)
//     //     // await atletaDB.save()

//     //     await Atleta.create(body)

//     //     res.redirect('/atletas')    

//     // } catch (error) {
//     //     console.log(error)
//     // }
// })    

// router.get('/:id', async (req, res) => {
        
//     const id = req.params.id
     
//     try {     

//         const atletaDB = await Atleta.findOne({ _id: id })
//         console.log(atletaDB)
        
//         res.render('detalle', {
//             atleta: atletaDB,
//             error: false           
//         })       
        
//     } catch (error) {       
//         res.render('detalle', { 
//             error: true,
//             mensaje:"no encontrado"
//         })
//     }
// })

// router.delete('/:id', async (req, res) => {
//     const id = req.params.id

//     try {
//         const atletaDB = await Atleta.findByIdAndDelete({ _id: id })
        
//         if (atletaDB) {
//             res.json({
//                 estado : true,
//                 mensaje : "Eliminado!"
//             });
//         } else {
//             res.json({
//                 estado : false,
//                 mensaje : "Fallo eliminar"
//             });
//         }

//     } catch (error) {
//         console.log(error)
//     }

// })

// router.post('/:id', async (req, res) => {
//     const {id} = req.body
//     const body = req.body

    // for (let index = 0; index < id.length; index++) {
    //     const el = id[index];
    //     console.log(el)
    //     console.log(body)
    

// id.forEach(element => {
//     console.log(element); 
router.put('/:id', async (req, res) => {
    // router.post('/:id', async (req, res) => {
       const {id} = req.body
        const body = req.body
    // console.log(id)
    // console.log(body.Nombre)
     
    try {

        // console.log(id)
        // console.log(body)

        // const categoriaDB = await Categoria.findByIdAndUpdate(id, body, { useFindAndModify: false })
       
       
        const categoriaDB = await Eventos.findByIdAndUpdate({ _id: id },{
            $push: {
                Competidor: {
                    FechaActual: body.FechaActual, 
                    IDFDFF: body.IDFDFF, 
                    Nombre: body.Nombre, 
                    Cedula: body.Cedula, 
                    Nacimiento: body.Nacimiento,
                    Edad: body.Edad,
                    Sexo: body.Sexo,
                    Peso: body.Peso,
                    Estatura: body.Estatura, 
                    Sector: body.Sector,
                    Preparador: body.Preparador
                }
            }
        })

    // });
        // console.log(atletaDB)
        
        // res.json({
        //     estado: true,
        //     mensaje: 'Editado'
        // })
        
    } catch (error) {
        console.log(error)
        
        // res.json({
        //     estado: false,
        //     mensaje: 'Fallamos!!'
        // })
    }



})

// })
// })


module.exports = router;

 

