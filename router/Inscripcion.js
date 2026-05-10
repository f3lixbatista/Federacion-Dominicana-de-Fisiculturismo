const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { checkRole } = require('../middlewares/auth');

// 1. VISTA PRINCIPAL: Carga atletas y categorías CON sus competidores ya inscritos
router.get('/', async (req, res) => {
    try {  
        // 1. Traemos la "Cartelera" del evento (Unión de Eventos + Categorías)
        // Aquí es donde vive 'orden_secuencia_categoria'
        const { data: arrayCategorias, error: errCat } = await supabase
            .from('eventos_categorias')
            .select(`
                id,
                orden_secuencia_categoria,
                evento_id,
                eventos (nombre),
                categorias (id, nombre, modalidad, disciplina, division)
            `)
            .order('orden_secuencia_categoria', { ascending: true });

        // 2. Traemos atletas (Para el buscador del Estadístico)
        const { data: arrayAtletas, error: errAtl } = await supabase
            .from('atletas')
            .select('*');

        // 3. Traemos las INSCRIPCIONES (Antes llamadas competidores)
        const { data: todasLasInscripciones, error: errIns } = await supabase
            .from('inscripciones')
            .select(`
                *,
                profiles (full_name) -- Traemos el nombre desde perfiles
            `);

        if (errCat || errAtl || errIns) throw (errCat || errAtl || errIns);

        // 4. Cruzamos los datos: Metemos a los atletas inscritos en su categoría
        if (arrayCategorias) {
            arrayCategorias.forEach(catRel => {
                // Filtramos las inscripciones que coincidan con el ID de la relación evento_categoria
                catRel.Competidor = todasLasInscripciones.filter(ins => ins.evento_cat_id === catRel.id);
            });
        }

        res.render("inscripcion", {
            arrayAtletas: arrayAtletas || [],
            arrayCategorias: arrayCategorias || []
        });

    } catch (error) {
        console.error("🔥 Error al cargar inscripción:", error.message);
        res.render("inscripcion", { arrayAtletas: [], arrayCategorias: [] });
    }
});


// 2. ASIGNAR NÚMEROS DE COMPETIDOR (La ruta que faltaba para el botón verde)
router.post('/asignar-numeros', async (req, res) => {
    const { IdCompetidor, Numero } = req.body;
    
    try {
        const promesas = [];
        const ids = Array.isArray(IdCompetidor) ? IdCompetidor : [IdCompetidor];
        const numeros = Array.isArray(Numero) ? Numero : [Numero];

        // Actualizamos cada competidor con su nuevo número
        for (let i = 0; i < ids.length; i++) {
            if (ids[i]) {
                promesas.push(
                    supabase
                        .from('competidores')
                        .update({ numero_competidor: numeros[i] })
                        .eq('id', ids[i])
                );
            }
        }

        await Promise.all(promesas);
        res.redirect('/inscripcion');

    } catch (error) {
        console.error("Error al asignar números:", error.message);
        res.status(500).send("Error actualizando números");
    }
});



// Ruta principal de inscripción
router.get('InscripcionAtleta', checkRole(['atleta', 'admin']), async (req, res) => {
    try {
        // Traemos eventos y sus categorías vinculadas en una sola consulta (Join)
        const { data: eventosConCategorias, error } = await supabase
            .from('eventos')
            .select(`
                id,
                nombre,
                lugar,
                fecha_inicio,
                eventos_categorias (
                    id,
                    categoria_id,
                    categorias (nombre, modalidad, disciplina, division)
                )
            `)
            .eq('estado', 'inscripcion');

        if (error) throw error;

        res.render('inscripcionAtleta', { eventos: eventosConCategorias });
    } catch (error) {
        console.error("Error:", error.message);
        res.render('inscripcionAtleta', { eventos: [] });
    }
});

// 4. PROCESAR INSCRIPCIÓN INDIVIDUAL (Vía AJAX/Fetch desde detalleInscripcion)
router.put('/:id', async (req, res) => {
    const body = req.body; // Viene del fetch de detalleInscripcion.ejs
    try {
        const { error } = await supabase
            .from('competidores')
            .insert([{
                id_evento: body.id_evento,
                idfdff: body.idfdff,
                nombre: body.nombre,
                cedula: body.cedula,
                peso_real: body.peso_real,
                estatura_real: body.estatura_real,
                preparador: body.preparador,
                numero_competidor: 0 
            }]);

        if (error) throw error;
        res.json({ estado: true, mensaje: 'Inscrito con éxito' });
        
    } catch (error) {
        console.error(error);
        res.json({ estado: false, mensaje: 'Error al inscribir' });
    }
});

// 2. Ruta para el ESTADÍSTICO (Para el módulo de Pesaje que haremos ahora)
router.get('/pesaje', checkRole(['estadistico', 'admin', 'juez']), async (req, res) => {
    try {
        const { data: atletas } = await supabase.from('atletas').select('*');
        // Enviamos los datos del usuario logueado (que vienen del middleware de auth)
        res.render('pesaje', { 
            atletas: atletas || [],
            juezLogueado: res.locals.user // Aquí va el perfil del que está usando la PC
        });
    } catch (error) {
        res.render('pesaje', { atletas: [], error: error.message });
    }
});


// 3. VISTA DETALLE PARA INSCRIBIR
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {     
        const { data: arrayCategorias } = await supabase
            .from('eventos')
            .select('*')
            .order('nombre', { ascending: true });

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
        res.render('detalleInscripcion', { error: true, mensaje: "Atleta no encontrado" });
    }
});

module.exports = router;
