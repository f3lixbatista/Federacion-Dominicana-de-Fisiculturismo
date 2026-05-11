const express = require('express');
const routerEventos = express.Router();
const { checkRole } = require('../middlewares/auth'); // Tu middleware de protección
const supabase = require('../supabaseClient');

// A. LISTADO GLOBAL: Lo que ve todo el mundo al entrar
routerEventos.get('/', async (req, res) => {
    try {
        const { data: eventos, error } = await supabase
            .from('eventos')
            .select('*')
            .order('fecha_inicio', { ascending: false });

        if (error) throw error;
        res.render('eventos/lista', { eventos });
    } catch (error) {
        res.status(500).send("Error al cargar eventos: " + error.message);
    }
});

// B. DASHBOARD DEL EVENTO: La página única para cada competencia
routerEventos.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error } = await supabase
            .from('eventos')
            .select(`
                *,
                eventos_categorias (
                    id,
                    categorias (*)
                )
            `)
            .eq('id', id)
            .single();

        if (error || !evento) return res.redirect('/eventos');

        // Renderizamos la vista enviando el objeto 'evento' y el 'user' (vía res.locals)
        res.render('eventos/dashboard', { evento });
    } catch (error) {
        res.redirect('/eventos');
    }
});

module.exports = routerEventos;
