const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient'); // Importamos el cliente que configuramos

// 1. LISTAR TODOS LOS ATLETAS
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('atletas')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        res.render("atletas", {
            arrayAtletas: data
        });
    } catch (error) {
        console.log("Error al listar:", error.message);
        res.render("atletas", { arrayAtletas: [] });
    }
});

// 2. VISTA CREAR
router.get('/crear', (req, res) => {
    res.render('crear');
});

// 3. PROCESAR CREACIÓN
router.post('/crear', async (req, res) => {
    try {
        const { error } = await supabase
            .from('atletas')
            .insert([req.body]); // Insertamos el objeto directamente

        if (error) throw error;
        res.redirect('/atletas');
    } catch (error) {
        console.log("Error al crear:", error.message);
        res.redirect('/atletas');
    }
});

// 4. VER DETALLE DE UN ATLETA
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('atletas')
            .select('*')
            .eq('id', id) // En Postgres/Supabase usamos el ID de la tabla
            .single();

        if (error || !data) throw error;

        res.render('detalle', {
            atleta: data,
            error: false
        });
    } catch (error) {
        res.render('detalle', {
            error: true,
            mensaje: "No encontrado"
        });
    }
});

// 5. ELIMINAR ATLETA
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { error } = await supabase
            .from('atletas')
            .delete()
            .eq('id', id);

        if (!error) {
            res.json({ estado: true, mensaje: "Eliminado!" });
        } else {
            res.json({ estado: false, mensaje: "Fallo eliminar" });
        }
    } catch (error) {
        res.json({ estado: false, mensaje: error.message });
    }
});

// 6. EDITAR ATLETA
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const body = req.body;
    try {
        const { error } = await supabase
            .from('atletas')
            .update(body)
            .eq('id', id);

        if (error) throw error;

        res.json({ estado: true, mensaje: 'Editado' });
    } catch (error) {
        res.json({ estado: false, mensaje: 'Fallamos!!' });
    }
});

module.exports = router;
