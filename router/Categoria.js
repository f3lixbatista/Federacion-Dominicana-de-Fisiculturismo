const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { checkPermiso } = require('../middlewares/auth');
const multer = require('multer');
const eventosController = require('../controllers/eventosController');
const upload = multer({ storage: multer.memoryStorage() });



// 1. LISTAR CATEGORÍAS
router.get('/', checkPermiso('categorias', 'ver'), async (req, res) => {
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
router.get('/crearCategoria', checkPermiso('categorias', 'ver'), (req, res) => {
    res.render('crearCategoria'); // Ajustado a la subcarpeta categorias
});

// 3. PROCESAR CREACIÓN DE CATEGORÍA (Backend)
router.post('/crear', checkPermiso('categorias', 'crear'), async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('categorias')
            .insert([req.body])
            .select();

        if (error) throw error;

        res.json({ estado: true, mensaje: "Categoría creada con éxito" });
    } catch (error) {
        console.error("Error backend crear categoría:", error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
});

// 3. VISTA NUEVO EVENTO (Acceso: Ejecutivo y Admin)
router.get('/nuevoEvento', checkPermiso('categorias', 'ver'), async (req, res) => {
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
router.post('/nuevoEvento', checkPermiso('eventos', 'crear'), upload.fields([
    { name: 'banner_evento', maxCount: 1 },
    { name: 'banner_pesaje', maxCount: 1 }
]), eventosController.crearNuevoEvento);

// ── API CATÁLOGO ──────────────────────────────────────────────────────────────

// GET /categorias/api/disciplinas?sexo=M|F|F-M&modalidad=Children|Junior|Senior|Master
router.get('/api/disciplinas', checkPermiso('categorias', 'ver'), async (req, res) => {
    const { sexo, modalidad } = req.query;
    let query = supabaseAdmin.from('disciplinas').select('*').order('nombre');
    // Filtro estricto por sexo: M→solo M, F→solo F, F-M→solo F-M
    if (sexo) query = query.eq('sexo', sexo);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    let resultado = data || [];
    // Filtro por modalidad: Children→solo disciplinas infantiles; otros→excluir infantiles
    if (modalidad === 'Children') {
        resultado = resultado.filter(d => d.nombre.toLowerCase().includes('children'));
    } else if (modalidad) {
        resultado = resultado.filter(d => !d.nombre.toLowerCase().includes('children'));
    }
    res.json(resultado);
});

// POST /categorias/api/disciplinas  { nombre, sexo, divisionIds[] }
router.post('/api/disciplinas', checkPermiso('categorias', 'crear'), async (req, res) => {
    const { nombre, sexo, grupo_afinidad, divisionIds } = req.body;
    try {
        const { data: disc, error } = await supabaseAdmin
            .from('disciplinas').insert([{ nombre, sexo, grupo_afinidad: grupo_afinidad || null }]).select().single();
        if (error) throw error;
        if (Array.isArray(divisionIds) && divisionIds.length > 0) {
            await supabaseAdmin.from('disciplina_divisiones').insert(
                divisionIds.map(did => ({ disciplina_id: disc.id, division_id: did }))
            );
        }
        res.json(disc);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /categorias/api/divisiones?disciplinaId=xxx  (sin param → devuelve todas)
router.get('/api/divisiones', checkPermiso('categorias', 'ver'), async (req, res) => {
    const { disciplinaId } = req.query;
    try {
        if (disciplinaId) {
            const { data: links } = await supabaseAdmin
                .from('disciplina_divisiones')
                .select('divisiones(*)')
                .eq('disciplina_id', disciplinaId);
            return res.json((links || []).map(l => l.divisiones).filter(Boolean));
        }
        const { data } = await supabaseAdmin.from('divisiones').select('*').order('nombre');
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /categorias/api/divisiones  { nombre, parametro, disciplinaId? }
router.post('/api/divisiones', checkPermiso('categorias', 'crear'), async (req, res) => {
    const { nombre, parametro, disciplinaId } = req.body;
    try {
        const { data: div, error } = await supabaseAdmin
            .from('divisiones').insert([{ nombre, parametro: parametro || 'ninguno' }]).select().single();
        if (error) throw error;
        if (disciplinaId) {
            await supabaseAdmin.from('disciplina_divisiones')
                .insert([{ disciplina_id: disciplinaId, division_id: div.id }]);
        }
        res.json(div);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /categorias/api/disciplina-division  { disciplinaId, divisionId }
router.post('/api/disciplina-division', checkPermiso('categorias', 'crear'), async (req, res) => {
    const { disciplinaId, divisionId } = req.body;
    try {
        await supabaseAdmin.from('disciplina_divisiones')
            .upsert([{ disciplina_id: disciplinaId, division_id: divisionId }]);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /categorias/todas  — borra todas las categorias (admin solamente)
router.delete('/todas', checkPermiso('categorias', 'eliminar'), async (req, res) => {
    const { error } = await supabaseAdmin.from('categorias').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

module.exports = router;
