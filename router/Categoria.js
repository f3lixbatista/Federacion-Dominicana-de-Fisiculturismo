const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// const { collection } = require('../models/atletamodel');
// const { db } = require('../models/categoriamodel');
const Schema = mongoose.Schema;

const Atleta = require('../models/atletamodel');



router.get('/', async (req, res) => {

    try {

        const arrayCategoriaDB = await Atleta.find();
        console.log(arrayCategoriaDB)
        
        res.render("categorias", {
            arrayCategorias: arrayCategoriaDB
        })
    
    } catch (error) {
        console.log(error)
    }

})

router.get('/crearCategoria', (req, res) => {
    res.render('crearCategoria')
    
});

router.post('/crearCategoria', async (req, res) => {
    const body = req.body
    console.log(body)

    // try {
    //     // const atletaDB = new Atleta(body)
    //     // await atletaDB.save()

    //     await Categoria.create(body)

    //     res.redirect('/categorias')    

    // } catch (error) {
    //     console.log(error)
    // }
})  

router.get('/nuevoEvento', async (req, res) => {

    try {
    
        const arrayCategoryDB = await Categoria.find();
        console.log(arrayCategoryDB)
        
        res.render('nuevoEvento', {
           
            arrayCategorias: arrayCategoryDB
        })
    
    } catch (error) {
        console.log(error)
    }
})

router.post('/nuevoEvento', async (req, res) => {
    const {NombreEvento} = req.body
    console.log(NombreEvento)
    // const datosCategoria = req.body
  
    const {Categoria} = req.body
    
    console.log(Categoria)

    // // db.createCollection(NombreEvento)
    // // console.log(datosCategoria)
    // try {

    //     const CategoriaSchema = new Schema({  
    //         Categoria: String,
    //         Salida: Number,
    //         Competidor: Array,
    //         Estadisticas: Array
    //     });

    //     const categoriasAdds = mongoose.model(NombreEvento, CategoriaSchema);
     
    // if (Categoria.length > 0)
    // for (i = 0; i < Salida.length; i++) {
        
        
       
    //     datosCategoria = {
    //         Categoria: Categoria[i],
    //         Salida: Salida[i],
    //         Competidor: [],
    //         Estadisticas: []

    //     }

    //     console.log(datosCategoria)
    //     console.log(categoriasAdds)
        // const atletaDB = new Atleta(body)
        // await atletaDB.save()

    //     await categoriasAdds.create(datosCategoria)
   
        
    // }

        // res.redirect('/categorias') 

    // } catch (error) {
    //     console.log(error)
    // }

    // const prueba = db.collections
    // console.log(prueba)

    // for (let cuerpo in prueba){  
    //         console.log(cuerpo + " " + prueba[cuerpo]);
    //     }

    

    
})


router.get('/formDinamica', (req, res) => {
    res.render('formDinamica')
    
});

// router.get('/dinamica', (req, res) => {
//     res.render('dinamica') 
// });
router.get('/dinamica',  (req, res) => {
       
    res.render("dinamica")
           
})

router.post('/formDinamica', async (req, res) => {
    // res.render('/formDinamica')
    const {eventoDinamico} = req.body
    const dinamicGlobal = eventoDinamico
    
    const DinamicaSchema = new Schema({  
        Categoria: String,
        Salida: Number,
        Competidor: Array,
        Estadisticas: Array
    });
    // console.log(dinamicGlobal)
    const dinamicG = mongoose.model(dinamicGlobal, DinamicaSchema);
//mongoose.Collection.find()
    try {
        console.log(dinamicGlobal)
        const arrayDinamico = await dinamicG.find(); 
        console.log(arrayDinamico)
        
        res.render("dinamica", {
            arrayDinamicos: arrayDinamico,
            eventosDinamicos: dinamicGlobal
            
        })
    
    } catch (error) {
        console.log(error)
    }

})



// NombreEvento

// router.get('/crearEvento',  (req, res) => {
       
//     res.render("crearEvento")
           
// })
    

// router.post('/crearEvento', async (req, res) => {
    // const arrayBody = req.body
    // const Evento_form = req.body
    // const {Salida} = req.body
    // const {Categoria} = req.body
    // console.log(arrayBody)
    // console.log(Evento_form)
    // console.log(Salida)
    // console.log(Categoria);
    

    // let cat = Salida[2] + " " + Categoria[2]
    // console.log(cat)

    // if(Salida.length > 0) {
    //     Salida.forEach((element) => console.log(element))}
    //     if(Categoria.length > 0) {
    //         Categoria.forEach((element) => console.log(element))}


    // for (let cuerpo in arrayBody){  
    //     console.log(cuerpo + " " + arrayBody[cuerpo]);
    // }
    
    // const EventoSchema = new Schema({
    //     Evento_form: String,
    //     Categoria: String,
    //     Salida: Number,
    //     Competidores: Array
    // });
    
    // const newEvento = mongoose.model(Evento_form, EventoSchema);

    // const CategoriaSchema = new Schema({
        
    //     Categoria: String,
    //     Salida: Number,
    //     Competidores: Array
    // });

    // const categoriasAdds = mongoose.model(Evento_form, CategoriaSchema);

    // try {
        
       
        //  db.createCollection(Evento_form.Evento_form)
        // categoriasAdds.create(arrayBody)

        // router.get('/NuevaCategoria', async (req, res) => {
        //     res.render('NuevaCategoria')

            // try {
        
                
                
                // res.redirect('/categorias/NuevaCategoria')  
            
            // } catch (error) {
            //     console.log(error)
            // }
        
        // })
         

    // } catch (error) {
    //     console.log(error)
    // }









// }) 


  

router.get('/inscripcion',  (req, res) => {
       
    res.render("inscripcion")
           
})


module.exports = router;

 

