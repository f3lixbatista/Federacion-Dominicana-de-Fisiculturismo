const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

router.get('/muro', async (req, res) => {
    try {
        // Traemos las publicaciones unidas con los nombres de atletas y eventos
        const { data: publicaciones, error } = await supabase
            .from('publicaciones_muro')
            .select(`
                *,
                profiles:atleta_id (nombre),
                eventos:evento_id (nombre)
            `)
            .order('fecha_publicacion', { ascending: false });

        if (error) throw error;

        res.render('social/muro', { 
            publicaciones: publicaciones || [],
            user: res.locals.user 
        });
    } catch (error) {
        console.error("Error en muro:", error.message);
        res.redirect('/');
    }
});

module.exports = router;