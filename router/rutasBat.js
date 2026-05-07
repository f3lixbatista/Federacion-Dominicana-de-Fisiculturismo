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
router.get('/jueces', checkRole(['juez', 'admin']), (req, res) => {
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
router.get('/IscripcionAtleta', checkRole(['atleta', 'admin']), (req, res) => {
    res.render('IscripcionAtleta', { titulo: "Inscripcion de Atletas" });
});

// router/rutasBat.js
router.get('/logout', (req, res) => {
    // Esta vista se encargará de limpiar el cliente y luego redirigir
    res.render('logout', { titulo: "Cerrando Sesión..." });
});


module.exports = router;
