const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// 1. VISTA PRINCIPAL DE ESTADÍSTICAS (LISTAR CATEGORÍAS/EVENTOS)
router.get('/', async (req, res) => {
    try {  
        // Consultamos la tabla eventos ordenada por la columna 'salida'
        const { data: arrCategorias, error } = await supabase
            .from('eventos')
            .select('*')
            .order('salida', { ascending: true });

        if (error) throw error;
        
        res.render('estadisticas', {
            arrCategorias: arrCategorias
        });
    
    } catch (error) {
        console.error("Error en estadísticas:", error.message);
        res.render('estadisticas', { arrCategorias: [] });
    }
});

// 2. VISTA DE CÁLCULOS PARA UN EVENTO ESPECÍFICO
router.get('/:id', async (req, res) => {
    const id = req.params.id;
     
    try {     
        // Obtenemos los datos del evento/categoría
        const { data: datosEvento, error: errEvento } = await supabase
            .from('eventos')
            .select('*')
            .eq('id', id)
            .single();

        // OPCIONAL: Si necesitas los competidores de este evento para los cálculos
        const { data: competidores, error: errComp } = await supabase
            .from('competidores')
            .select('*')
            .eq('id_evento', id);

        if (errEvento) throw errEvento;
        
        // Combinamos los datos si tu vista 'calculos' espera ver a los competidores dentro
        if (datosEvento) {
            datosEvento.Competidor = competidores || [];
        }

        res.render('calculos', {
            datos: datosEvento,
            error: false           
        });       
        
    } catch (error) {       
        console.error(error);
        res.render('calculos', { 
            error: true,
            mensaje: "No encontrado"
        });
    }
});

module.exports = router;
