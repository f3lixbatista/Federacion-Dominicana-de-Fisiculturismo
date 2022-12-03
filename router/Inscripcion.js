const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { findOneAndReplace } = require('../models/atletamodel');
const Schema = mongoose.Schema;
const Atleta = require('../models/atletamodel')
const Eventos = require('../models/eventomodel')
const Competidor = require('../models/eventomodel')

router.get('/', async (req, res) => {

    try {  
        const arrayCategoriaDB = await Eventos.find();
        const arrayAtletaDB = await Atleta.find();
        // console.log(arrayAtletaDB)
        arrayCategoriaDB.sort((o1, o2) => {
            if (o1.Salida < o2.Salida) {
                return -1;
            } else if (o1.Salida > o2.Salida) {
                return 1;
            } else {
                return 0;
            }
        });

        res.render("inscripcion", {
            arrayAtletas: arrayAtletaDB,
            arrayCategorias: arrayCategoriaDB
            
        })
    
    } catch (error) {
        console.log(error)
    }

})


router.post('/', async (req, res) => {
    const body = req.body
    // console.log(body)
    for (let z = 0; z < body.Numero.length; z++) {
    const id = body.IdCat[z]
    const FechaActual = body.FechaActual[z]
    const IDFDFF = body.IDFDFF[z] 
    const Nombre = body.Nombre[z] 
    const Cedula = body.Cedula[z]
    const Nacimiento = body.Nacimiento[z]
    const Edad = body.Edad[z]
    const Sexo = body.Sexo[z]
    const Peso = body.Peso[z]
    const Estatura = body.Estatura[z] 
    const Sector = body.Sector[z]
    const Numero = body.Numero[z]
    const Preparador = body.Preparador[z]
    // console.log(id)
    // console.log(IDFDFF)
    // console.log(Nombre)
    // console.log(Cedula)
    // console.log(Nacimiento)
    // console.log(Edad)
    // console.log(Sexo)
    // console.log(Peso)
    // console.log(Estatura)
    // console.log(Sector)
    // console.log(Numero)
    // console.log(Preparador)
              
                // const id = body.IdCat[z]
                // const FechaActual = body.FechaActual[z]
                // const IDFDFF = body.IDFDFF[z] 
                // const Nombre = body.Nombre[z] 
                // const Cedula = body.Cedula[z]
                // const Nacimiento = body.Nacimiento[z]
                // const Edad = body.Edad[z]
                // const Sexo = body.Sexo[z]
                // const Peso = body.Peso[z]
                // const Estatura = body.Estatura[z] 
                // const Sector = body.Sector[z]
                // const Numero = body.Numero[z]
                // const Preparador = body.Preparador[z]

    // modifyBody = {
    //     Competidor: [
    //     //     z =
    //      { $push: {
    //         [z]: {
         
    //         IDFDFF: IDFDFF, 
    //         Nombre: Nombre, 
    //         FechaActual: FechaActual,
    //         Cedula: Cedula, 
    //         Nacimiento: Nacimiento,
    //         Edad: Edad,
    //         Sexo: Sexo,
    //         Peso: Peso,
    //         Estatura: Estatura, 
    //         Sector: Sector,
    //         Numero: Numero,
    //         Preparador: Preparador
    //         }
    //      }
    //     }] 
    // }
   
        // console.log(modifyBody)

        try {

            const atletaDB = await Eventos.findByIdAndUpdate({ _id: id },{


        //     // const EventoDB = await Eventos.findByIdAndUpdate({ _id: id }, {
                
            $set: 
                { Competidor: [z ={
                   IDFDFF: IDFDFF, 
                       FechaActual: FechaActual,
                       Nombre: Nombre, 
                       Cedula: Cedula, 
                       Nacimiento: Nacimiento,
                       Edad: Edad,
                       Sexo: Sexo,
                       Peso: Peso,
                       Estatura: Estatura, 
                       Sector: Sector,
                       Numero: Numero,
                       Preparador: Preparador
                 
                }]
        //     // })
        }
        //     // console.log(atletaDB)
    
        //     // res.json({
        //     //     estado: true,
        //     //     mensaje: 'Editado'
            })
            
        } catch (error) {
            console.log(error)
            
        //     // res.json({
        //     //     estado: false,
        //     //     mensaje: 'Fallamos!!'
        //     // })
         }



        // try {

        //     // const EventoDB = await Eventos.findByIdAndUpdate(id, numeroAtleta, { useFindAndModify: false })
        //     // console.log(atletaDB)
            // 
            
            //             [z] : {
            //                 Numero: numero
            //             }
            //             // Numero: numero 
                        
                    
            //     }
            // })

        // } catch (error) {
        //     console.log(error)

        }

    


    // try {
    //     // const atletaDB = new Atleta(body)
    //     // await atletaDB.save()

    //     await Atleta.create(body)

    //     res.redirect('/atletas')    

    // } catch (error) {
    //     console.log(error)
    // }
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

 
router.put('/:id', async (req, res) => {
    // router.post('/:id', async (req, res) => {
       const {id} = req.body
        const body = req.body
     
    try {
       
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
                    Numero: 0,
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
// module.exports = Eventos;

 

