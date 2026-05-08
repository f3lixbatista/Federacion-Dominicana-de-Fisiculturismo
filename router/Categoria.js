const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { checkRole } = require('../middlewares/auth');

// 1. LISTAR CATEGORÍAS (Acceso: Ejecutivo y Admin)
router.get('/', checkRole(['ejecutivo', 'admin']), async (req, res) => {
    try {
        const { data: arrayCategorias, error } = await supabase
            .from('categorias')
            .select('*')
            .order('modalidad', { ascending: true });

        if (error) throw error;
        
        res.render("categorias", {
            arrayCategorias: arrayCategorias
        });
    } catch (error) {
        console.error("Error al listar categorías:", error.message);
        res.render("categorias", { arrayCategorias: [] });
    }
});

// 2. VISTA CREAR CATEGORÍA (Acceso: Ejecutivo y Admin)
router.get('/crearCategoria', checkRole(['ejecutivo', 'admin']), (req, res) => {
    res.render('crearCategoria'); // Ajustado a la subcarpeta categorias
});

// 3. VISTA NUEVO EVENTO (Acceso: Ejecutivo y Admin)
router.get('/nuevoEvento', checkRole(['ejecutivo', 'admin']), async (req, res) => {
    try {
        const { data: arrayCategoryDB, error } = await supabase
            .from('categorias')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;
           
        res.render('nuevoEvento', {           
            arrayCategorias: arrayCategoryDB,
            error: false  
        });
    } catch (error) {
        console.error("Error al cargar categorías para evento:", error.message);
        res.render('nuevoEvento', { 
            error: true,
            mensaje: "Error al cargar categorías",
            arrayCategorias: []
        });
    }
});

// 4. PROCESAR NUEVO EVENTO (Estructura Relacional)
router.post('/nuevoEvento', checkRole(['ejecutivo', 'admin']), async (req, res) => {
    const { NombreEvento, Categorias, Salida } = req.body;

    try {
        // 1. Crear el Evento en la tabla 'eventos' y obtener su ID
        const { data: eventoCreado, error: errorEv } = await supabase
            .from('eventos')
            .insert([{ nombre: NombreEvento }])
            .select()
            .single();

        if (errorEv) throw errorEv;

        // 2. Obtener los IDs de las categorías seleccionadas desde la DB
        const nombresCategorias = Array.isArray(Categorias) ? Categorias : [Categorias];
        const { data: categoriasDB, error: errorCats } = await supabase
            .from('categorias')
            .select('id, nombre')
            .in('nombre', nombresCategorias);

        if (errorCats) throw errorCats;

        // 3. Preparar los datos para la tabla intermedia 'eventos_categorias'
        // Usamos el 'Salida' que viene del formulario para el orden
        const ordenes = Array.isArray(Salida) ? Salida : [Salida];
        
        const vinculos = categoriasDB.map((cat, index) => {
            // Buscamos el orden que el usuario escribió para esta categoría específica
            // Si no hay orden, usamos el índice del bucle
            const ordenSalida = ordenes[index] || (index + 1);
            
            return {
                evento_id: eventoCreado.id,
                categoria_id: cat.id,
                orden_secuencia_categoria: parseInt(ordenSalida)
            };
        });

        // 4. Insertar la lista masiva en 'eventos_categorias'
        const { error: errorVinculo } = await supabase
            .from('eventos_categorias')
            .insert(vinculos);

        if (errorVinculo) throw errorVinculo;

        // Todo salió bien
        res.redirect('/categorias');

    } catch (error) {
        console.error("🔥 Error al procesar evento:", error.message);
        res.status(500).send("Error al procesar el evento: " + error.message);
    }
});


module.exports = router;
