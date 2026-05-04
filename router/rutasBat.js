const express = require('express');
const router = express.Router();

// Ruta de Inicio
router.get('/', (req, res) => {
    res.render("index", { titulo: "BatWeb - Inicio" });
});
  
// Ruta de Servicios (Si tienes la vista servicios.ejs)
router.get('/servicios', (req, res) => {
    res.render("servicios", { titulo: "Servicios BatWeb" });
});

// Ruta de Jueces
router.get('/jueces', (req, res) => {
    res.render('jueces', { titulo: "Comité de Jueces" });
});

// Ruta de Noticias
router.get('/noticias', (req, res) => {
    res.render('noticias', { titulo: "Noticias FDFF" });
});

// Ruta Social (La que acabamos de optimizar)
router.get('/social', (req, res) => {
    res.render('social', { titulo: "Federados Social" });
});

module.exports = router;
