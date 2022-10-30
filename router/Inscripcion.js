const express = require('express');
const router = express.Router();
// const mongoose = require('mongoose');
// const { db, collection } = require('../models/categoriamodel');
// const Schema = mongoose.Schema;
const Atleta = require('../models/atletamodel')

router.get('/', async (req, res) => {

    try {

        const arrayAtletaDB = await Atleta.find();
        console.log(arrayAtletaDB)
        
        res.render("inscripcion", {
            arrayAtletas: arrayAtletaDB
        })
    
    } catch (error) {
        console.log(error)
    }

})

router.get('/:id', async (req, res) => {
        
    const id = req.params.id
     
    try {     

        const atletaDB = await Atleta.findOne({ _id: id })
        // console.log(atletaDB)
        
        res.render('detalleInscripcion', {
            atleta: atletaDB,
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


// router.put('/:id', async (req, res) => {
//     const id = req.params.id
    
//     const body = req.body
    
//     try {

//         const atletaDB = await Atleta.findByIdAndUpdate(id, body, { useFindAndModify: false })
//         console.log(atletaDB)

//         res.json({
//             estado: true,
//             mensaje: 'Editado'
//         })
        
//     } catch (error) {
//         console.log(error)
        
//         res.json({
//             estado: false,
//             mensaje: 'Fallamos!!'
//         })
//     }
// })


module.exports = router;

 

