const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// 1. LISTAR CATEGORÍAS
router.get('/', async (req, res) => {
    try {
        const { data: arrayCategorias, error } = await supabase
            .from('categorias')
            .select('*');

        if (error) throw error;
        
        res.render("categorias", {
            arrayCategorias: arrayCategorias
        });
    } catch (error) {
        console.error(error);
        res.render("categorias", { arrayCategorias: [] });
    }
});

// 2. VISTAS DE CREACIÓN
router.get('/crearCategoria', (req, res) => {
    res.render('crearCategoria');
});

router.get('/nuevoEvento', async (req, res) => {
    try {
        const { data: arrayCategoryDB, error } = await supabase
            .from('categorias')
            .select('*');

        if (error) throw error;
           
        res.render('nuevoEvento', {           
            arrayCategorias: arrayCategoryDB,
            error: false  
        });
    } catch (error) {
        res.render('nuevoEvento', { 
            error: true,
            mensaje: "Error al cargar categorías"
        });
    }
});

// 3. PROCESAR NUEVA CATEGORÍA
router.post('/crearCategoria', async (req, res) => {
    try {
        const { error } = await supabase
            .from('categorias')
            .insert([req.body]);

        if (error) throw error;
        res.redirect('/categorias');    
    } catch (error) {
        console.error(error);
        res.redirect('/categorias');
    }
}); 

// 4. PROCESAR NUEVO EVENTO (Múltiples categorías a la vez)
router.post('/nuevoEvento', async (req, res) => {
    const { 
        Categorias, NombreEvento, Modalidad, Genero, 
        Disciplina, Division, DesdeEdad, HastaEdad, 
        DesdePeso, HastaPeso, DesdeEstatura, HastaEstatura 
    } = req.body;

    try {
        const listaEventos = [];

        // Si Categorias es un array (varios seleccionados)
        const total = Array.isArray(Categorias) ? Categorias.length : 1;

        for (let x = 0; x < total; x++) {
            listaEventos.push({
                categoria: Array.isArray(Categorias) ? Categorias[x] : Categorias,
                nombre: NombreEvento,
                modalidad: Array.isArray(Modalidad) ? Modalidad[x] : Modalidad,
                genero: Array.isArray(Genero) ? Genero[x] : Genero,
                disciplina: Array.isArray(Disciplina) ? Disciplina[x] : Disciplina,
                division: Array.isArray(Division) ? Division[x] : Division,
                desde_edad: Array.isArray(DesdeEdad) ? DesdeEdad[x] : DesdeEdad,
                hasta_edad: Array.isArray(HastaEdad) ? HastaEdad[x] : HastaEdad,
                desde_peso: Array.isArray(DesdePeso) ? DesdePeso[x] : DesdePeso,
                hasta_peso: Array.isArray(HastaPeso) ? HastaPeso[x] : HastaPeso,
                desde_estatura: Array.isArray(DesdeEstatura) ? DesdeEstatura[x] : DesdeEstatura,
                hasta_estatura: Array.isArray(HastaEstatura) ? HastaEstatura[x] : HastaEstatura,
                salida: 0 // Valor inicial
            });
        }

        const { error } = await supabase
            .from('eventos')
            .insert(listaEventos);

        if (error) throw error;
        res.redirect('/categorias');

    } catch (error) {
        console.error("Error al crear evento:", error.message);
        res.status(500).send("Error al procesar el evento");
    }
});

module.exports = router;
