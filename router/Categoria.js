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
router.post('/nuevoEvento', checkRole(['admin', 'ejecutivo']), async (req, res) => {
    const { NombreEvento, Lugar, Fecha, costo_primera, costo_adicional, CategoriasIds } = req.body;

    try {
        // 1. Insertar el evento con los costos del formulario
        const { data: evento, error: errEv } = await supabase
            .from('eventos')
            .insert([{ 
                nombre: NombreEvento, 
                lugar: Lugar, 
                fecha_inicio: Fecha,
                costo_primera_cat: parseFloat(costo_primera) || 0,
                costo_adicional: parseFloat(costo_adicional) || 0,
                estado: 'inscripcion'
            }])
            .select().single();

        if (errEv) throw errEv;

        // 2. Vincular categorías (sin pedir orden al usuario)
        const categoriasArray = Array.isArray(CategoriasIds) ? CategoriasIds : [CategoriasIds];
        const vinculos = categoriasArray.map(catId => ({
            evento_id: evento.id,
            categoria_id: catId,
            orden_secuencia_categoria: 0 // Se definirá en el módulo de MC
        }));

        const { error: errVin } = await supabase
            .from('eventos_categorias')
            .insert(vinculos);

        if (errVin) throw errVin;

        res.redirect('/categorias');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al crear evento: " + error.message);
    }
});



module.exports = router;
