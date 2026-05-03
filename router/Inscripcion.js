const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// 1. VISTA PRINCIPAL DE INSCRIPCIÓN
router.get('/', async (req, res) => {
    try {  
        const { data: arrayCategorias, error: errCat } = await supabase
            .from('eventos')
            .select('*')
            .order('salida', { ascending: true });

        const { data: arrayAtletas, error: errAtl } = await supabase
            .from('atletas')
            .select('*');

        if (errCat || errAtl) throw (errCat || errAtl);

        res.render("inscripcion", {
            arrayAtletas: arrayAtletas,
            arrayCategorias: arrayCategorias
        });
    } catch (error) {
        console.error("Error al cargar inscripción:", error.message);
        res.render("inscripcion", { arrayAtletas: [], arrayCategorias: [] });
    }
});

// 2. PROCESAR INSCRIPCIÓN MULTIPLE (POST)
router.post('/', async (req, res) => {
    const body = req.body;
    
    try {
        // Preparamos los datos para una inserción masiva
        const inscripciones = [];
        
        // El loop asume que body.Numero es un array
        const total = Array.isArray(body.Numero) ? body.Numero.length : 1;

        for (let z = 0; z < total; z++) {
            inscripciones.push({
                id_evento: Array.isArray(body.IdCat) ? body.IdCat[z] : body.IdCat,
                idfdff: Array.isArray(body.IDFDFF) ? body.IDFDFF[z] : body.IDFDFF,
                nombre: Array.isArray(body.Nombre) ? body.Nombre[z] : body.Nombre,
                cedula: Array.isArray(body.Cedula) ? body.Cedula[z] : body.Cedula,
                numero_competidor: Array.isArray(body.Numero) ? body.Numero[z] : body.Numero,
                // Agrega aquí el resto de campos que necesites guardar en la tabla competidores
            });
        }

        const { error } = await supabase
            .from('competidores')
            .insert(inscripciones);

        if (error) throw error;
        res.redirect('/atletas');

    } catch (error) {
        console.error("Error al procesar inscripción:", error.message);
        res.status(500).send("Error en la base de datos");
    }
});

// 3. VISTA DETALLE DE INSCRIPCIÓN POR ATLETA
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {     
        const { data: arrayCategorias } = await supabase.from('eventos').select('*');
        const { data: atleta, error } = await supabase
            .from('atletas')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        
        res.render('detalleInscripcion', {
            atleta: atleta,
            arrayCategorias: arrayCategorias,
            error: false           
        });
    } catch (error) {       
        res.render('detalleInscripcion', { 
            error: true,
            mensaje: "Atleta no encontrado"
        });
    }
});

// 4. INSCRIPCIÓN INDIVIDUAL (PUT/PUSH)
router.put('/:id', async (req, res) => {
    const body = req.body;
    try {
        // En Supabase, para un "push", simplemente insertamos una nueva fila 
        // en la tabla de relación (competidores)
        const { error } = await supabase
            .from('competidores')
            .insert([{
                id_evento: body.id, // El ID de la categoría/evento
                idfdff: body.IDFDFF,
                nombre: body.Nombre,
                cedula: body.Cedula,
                fecha_inscripcion: body.FechaActual,
                numero_competidor: 0 // Valor por defecto inicial
            }]);

        if (error) throw error;
        res.json({ estado: true, mensaje: 'Inscrito con éxito' });
        
    } catch (error) {
        console.error(error);
        res.json({ estado: false, mensaje: 'Error al inscribir' });
    }
});

module.exports = router;
