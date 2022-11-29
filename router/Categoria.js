const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { db } = require('../models/categoriamodel');
const Schema = mongoose.Schema;
const Categoria = require('../models/categoriamodel');


router.get('/', async (req, res) => {

    try {

        const arrayCategoriaDB = await Categoria.find();
        // console.log(arrayCategoriaDB)
        
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

    try {

        await Categoria.create(body)
        res.redirect('/categorias')    

    } catch (error) {
        console.log(error)
    }
}) 

router.get('/nuevoEvento', async (req, res) => {

    try {
    
        const arrayCategoryDB = await Categoria.find();
           
        res.render('nuevoEvento', {           
            arrayCategorias: arrayCategoryDB,
            error: false  
        })
    
    } catch (error) {
        res.render('nuevoEvento', { 
            error: true,
            mensaje:"no encontrado"
        })
    }
})

router.post('/nuevoEvento', async (req, res) => {
    const sbody = req.body
    const {Categorias} = req.body
    const {NombreEvento} = req.body
    const {Modalidad} = req.body
    const {Genero} = req.body
    const {Disciplina} = req.body
    const {Division} = req.body
    const {DesdeEdad} = req.body
    const {HastaEdad} = req.body
    const {DesdePeso} = req.body
    const {HastaPeso} = req.body
    const {DesdeEstatura} = req.body
    const {HastaEstatura} = req.body
    // const splitEvento = NombreEvento.split(": ")
    // newEvento = splitEvento[1]
    // console.log(newEvento);
    // console.log(NombreEvento);
    // console.log(Modalidad);
    // console.log(Genero);
    // console.log(Disciplina);
    // console.log(Division);
    // console.log(DesdeEdad);
    // console.log(HastaEdad);
    // console.log(DesdePeso);
    // console.log(HastaPeso);
    // console.log(DesdeEstatura);
    // console.log(HastaEstatura);

    // const EventoSchema = new Schema({
    // NombreEvento: String,
    // Categorias: Array,
    
    // })

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


    const Eventos = mongoose.model(NombreEvento, EventoSchema);

    try {

        for (let x = 0; x < Categorias.length; x++) {
            element = Categorias[x];
            mod = Modalidad[x];
            gen = Genero[x];
            dis = Disciplina[x];
            div = Division[x];
            de = DesdeEdad[x];
            he = HastaEdad[x];
            dp = DesdePeso[x];
            hp = HastaPeso[x];
            des = DesdeEstatura[x];
            hes = HastaEstatura[x];

            // esquematizado = 'Categoria: ' + element

            datosCategoria = {
                Categoria: element,
                Evento: NombreEvento,
                Modalidad: mod,
                Genero: gen,
                Disciplina: dis,
                Division: div,
                DesdeEdad: de,
                HastaEdad: he,
                DesdePeso: dp,
                HastaPeso: hp,
                DesdeEstatura: des,
                HastaEstatura: hes,
                Salida: "",
                Competidor: [{
                FechaActual: "", 
                IDFDFF: "",
                Nombre: "",
                Cedula: "",
                Nacimiento: "",
                Edad: "",
                Sexo: "",
                Peso: "",
                Estatura: "", 
                Sector: "",
                Preparador: "",
                EstadisticasEliminatoria: [{
                    J1: "",
                    J2: "",
                    J3: "",
                    J4: "",
                    J5: "",
                    J6: "",
                    J7: "",
                    J8: "",
                    J9: "",
                    J10: "",
                    J11: "",
                    J12: "",
                    J13: "",
                    Total: "",
                    Posicion: "",
                }],
                EstadisticasSemiFinalR1: [{
                    J1: "",
                    J2: "",
                    J3: "",
                    J4: "",
                    J5: "",
                    J6: "",
                    J7: "",
                    J8: "",
                    J9: "",
                    J11: "",
                    J10: "",
                    J12: "",
                    J13: "",
                    Total: "",
                    Posicion: "",
                }],   
                EstadisticasSemiFinalR2: [{
                    J1: "",
                    J2: "",
                    J3: "",
                    J4: "",
                    J5: "",
                    J6: "",
                    J7: "",
                    J8: "",
                    J9: "",
                    J10: "",
                    J11: "",
                    J12: "",
                    J13: "",
                    Total: "",
                    Posicion: "",
                    TotalGralSem: "",
                    PosicionGralSem: "",
                }], 
                EstadisticasFinalR1: [{
                    J1: "",
                    J2: "",
                    J3: "",
                    J4: "",
                    J5: "",
                    J6: "",
                    J7: "",
                    J8: "",
                    J9: "",
                    J10: "",
                    J11: "",
                    J12: "",
                    J13: "",
                    TotalR1: "",
                    PosicionR1: "",
                }], 
                EstadisticasFinalR2: [{
                    J1: "",
                    J2: "",
                    J3: "",
                    J4: "",
                    J5: "",
                    J6: "",
                    J7: "",
                    J8: "",
                    J9: "",
                    J11: "",
                    J12: "",
                    J10: "",
                    J13: "",
                    TotalR2: "",
                    PosicionR2: "",
                    TotalGralFinal: "",
                    PosicionGralFinal: "",
        
                }],
                EstadisticasAbsoluto: [{
                    J1: "",
                    J2: "",
                    J3: "",
                    J4: "",
                    J5: "",
                    J6: "",
                    J7: "",
                    J8: "",
                    J9: "",
                    J10: "",
                    J11: "",
                    J12: "",
                    J13: "",
                    Total: "",
                    Posicion: "",
                    
                }],
                }]
            }           
            await Eventos.create(datosCategoria)
            console.log(datosCategoria);
        }
    
        // res.redirect('/categorias/formDinamica')      

    } catch (error) {
        console.log(error)
     }
})  

// router.put('/nuevoEvento', async (req, res) => {
//     const NombreEvento = req.body
//     console.log(NombreEvento)
//     const body = req.body
//     console.log(body)

// })

router.get('/formDinamica', (req, res) => {
    res.render('formDinamica')
    
});

router.get('/dinamica', async (req, res) => {
    const {eventoDinamico} = req.body
    const dinamicGlobal = eventoDinamico

    const DinamicaSchema = new Schema({
        Evento: String,
        Categoria: String,
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

    const dinamicG = mongoose.model(dinamicGlobal, DinamicaSchema);

    try {
        const arrayDinamico = await dinamicG.find(); 
        
        res.render("dinamica", {
            arrayDinamicos: arrayDinamico,
            eventosDinamicos: dinamicGlobal    
        })

    } catch (error) {
        console.log(error)
    }
});

router.post('/formDinamica', async (req, res) => {
    const {eventoDinamico} = req.body
    const dinamicGlobal = eventoDinamico
    
    const DinamicaSchema = new Schema({
        Evento: String,
        Categoria: String,
        Salida: Number,
        Competidor: [{
            FechaActual: Date, 
            IDFDFF: String,
            Nombre: String,
            // Cedula: String,
            //Nacimiento: Date,
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

    const dinamicG = mongoose.model(dinamicGlobal, DinamicaSchema);

    try {
   
        const arrayDinamico = await dinamicG.find(); 
        res.render("dinamica", {
            arrayDinamicos: arrayDinamico,
            eventosDinamicos: dinamicGlobal
        })
        
        res.redirect("/categorias/dinamica")
    
    } catch (error) {
        console.log(error)
    }

})

module.exports = router;

 

