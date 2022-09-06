const express = require('express');
const router = express.Router();

const Atleta = require('../models/atletamodel')

router.get('/', async (req, res) => {

    try {

        const arrayAtleta = await Atleta.find();
        console.log(arrayAtleta)
        
        res.render("atletas", {
            arrayAtletas: arrayAtleta
        })
    
    } catch (error) {
        console.log(error)
    }

})

router.get('/crear', (req, res) => {
    res.render('crear')

})

router.post('/', async (req, res) => {
    const body = req.body

    try {
        const atletaDB = new Atleta(body)
        await atletaDB.save()

        res.redirect('/atletas')    

    } catch (error) {
        console.log(error)
    }

   
})    

router.get('/:Nombre', async (req, res) => {
        
    const Nombre = req.params.Nombre

    try {
        
        const atletaDB = await Atleta.findOne({ Nombre: Nombre });
        console.log(atletaDB)
        
        res.render('detalle', {
            atleta: atletaDB,
            error: false
        })
        
    } catch (error) {
        console.log(error)
        res.render('detalle', {
            error: true,
            mensaje: 'no encontrado'
        })
    }
})

module.exports = router;

 

