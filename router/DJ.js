const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth, checkRole } = require('../middlewares/auth');

// Ruta para obtener el audio de un atleta (con fallback genérico al azar)
router.get('/obtener-audio/:competidorId', requireAuth, checkRole(['admin', 'estadistico', 'mc', 'fotografo']), async (req, res) => {
    try {
        const { data: comp, error: compError } = await supabase
            .from('competidores')
            .select('musica_url')
            .eq('id', req.params.competidorId)
            .single();

        if (compError) throw compError;

        if (comp && comp.musica_url) {
            return res.json({ url: comp.musica_url, esGenerica: false });
        } else {
            // Lógica de fallback: Traer lista del bucket genérico
            const { data: files, error: listError } = await supabase.storage.from('musica_generica').list();
            
            if (listError || !files || files.length === 0) throw new Error("No hay música genérica disponible en el bucket.");

            const randomFile = files[Math.floor(Math.random() * files.length)];
            const { data: { publicUrl } } = supabase.storage.from('musica_generica').getPublicUrl(randomFile.name);
            
            return res.json({ url: publicUrl, esGenerica: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;