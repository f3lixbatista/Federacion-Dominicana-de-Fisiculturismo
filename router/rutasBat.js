const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/auth'); // Importamos el protector de roles

// 1. INICIO (Abierto para todos los logueados)
router.get('/', (req, res) => {
    res.render("index", { titulo: "BatWeb - Inicio" });
});
  
// 2. SERVICIOS (Solo Atletas y Admin)
router.get('/servicios', checkRole(['atleta', 'admin']), (req, res) => {
    res.render("servicios", { titulo: "Servicios BatWeb" });
});

// 3. JUECES - Vista informativa (Solo Jueces y Admin)
router.get('/jueces', checkRole(['general', 'juez', 'admin']), (req, res) => {
    res.render('jueces', { titulo: "Comité de Jueces" });
});

// 4. NOTICIAS (Rol: General, Admin)
router.get('/noticias', checkRole(['general', 'admin']), (req, res) => {
    res.render('noticias', { titulo: "Noticias FDFF" });
});

// 5. SOCIAL (Rol: General, Admin)
router.get('/social', checkRole(['general', 'admin']), (req, res) => {
    res.render('social', { titulo: "Federados Social" });
});

// 6. INSCRIPCION ATLETA (Solo Atletas y Admin)
// router/rutasBat.js
/* router.get('/IscripcionAtleta', checkRole(['atleta', 'admin']), async (req, res) => {
    try {
        // 1. Consultamos los eventos desde Supabase
        const { data: eventosConCategorias, error } = await supabase
            .from('eventos')
            .select(`
                id, nombre, lugar, fecha_inicio,
                eventos_categorias (
                    id,
                    categoria_id,
                    categorias (nombre, modalidad, disciplina, division)
                )
            `)
            .eq('estado', 'inscripcion');

        if (error) throw error;

        // 2. PASO CRUCIAL: Enviar la variable 'eventos' a la vista
        res.render('InscripcionAtleta', { 
            eventos: eventosConCategorias || [] // Aquí le das el nombre que la vista espera
        });

    } catch (error) {
        console.error("Error en ruta:", error.message);
        // Si hay error, enviamos el array vacío para que la vista no explote
        res.render('InscripcionAtleta', { eventos: [] });
    }
});
 */

// router/rutasBat.js
router.get('/logout', (req, res) => {
    // Esta vista se encargará de limpiar el cliente y luego redirigir
    res.render('logout', { titulo: "Cerrando Sesión..." });
});


module.exports = router;
