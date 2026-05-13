const express = require('express');
const routerEventos = express.Router();
const { checkRole } = require('../middlewares/auth');
const eventosController = require('../controllers/eventosController');
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
        res.status(500).send('Error al cargar eventos: ' + error.message);
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

        let listadoPublico = [];
        if (['en_progreso', 'finalizado'].includes(evento.estado)) {
            const { data: categoriasPublicas, error: categoriasError } = await supabase
                .from('eventos_categorias')
                .select('id, orden_secuencia_categoria, categorias(nombre)')
                .eq('evento_id', id)
                .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion'])
                .order('orden_secuencia_categoria', { ascending: true });

            if (!categoriasError && categoriasPublicas) {
                for (const cat of categoriasPublicas) {
                    const { data: competidores, error: competidoresError } = await supabase
                        .from('competidores')
                        .select('numero_atleta, numero_competidor, nombre, gimnasio, preparador')
                        .eq('evento_cat_id', cat.id)
                        .eq('id_evento', id)
                        .order('numero_atleta', { ascending: true })
                        .order('created_at', { ascending: true });

                    if (competidoresError) continue;

                    listadoPublico.push({
                        id: cat.id,
                        orden: cat.orden_secuencia_categoria,
                        nombre: cat.categorias?.nombre || 'Categoría',
                        total: (competidores || []).length,
                        atletas: (competidores || []).map(atleta => ({
                            dorsal: atleta.numero_atleta || atleta.numero_competidor || 0,
                            nombre: atleta.nombre,
                            team: atleta.gimnasio || atleta.preparador || '--'
                        }))
                    });
                }
            }
        }

        res.render('eventos/dashboard', { evento, listadoPublico });
    } catch (error) {
        res.redirect('/eventos');
    }
});

// RUTA DE PREPARACIÓN DE EVENTO (alias compatible con la estructura anterior)
routerEventos.get('/preparacion-evento/:id', checkRole(['admin', 'estadistico']), eventosController.prepararEventoPage);

// RUTA PÚBLICA DE MONITOR MC
routerEventos.get('/:id/monitor-mc', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error } = await supabase
            .from('eventos')
            .select('id, nombre, cronograma_mc')
            .eq('id', id)
            .single();

        if (error || !evento) {
            return res.redirect('/eventos');
        }

        res.render('eventos/monitor_mc', {
            evento,
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseKey: process.env.SUPABASE_KEY
        });
    } catch (e) {
        console.error('Error cargando monitor MC:', e.message || e);
        res.redirect('/eventos');
    }
});

routerEventos.get('/:id/preparacion', checkRole(['ejecutivo', 'admin']), eventosController.prepararEventoPage);
routerEventos.post('/preparacion/oficializar', checkRole(['ejecutivo', 'admin']), eventosController.oficializarPreparacion);

module.exports = routerEventos;
