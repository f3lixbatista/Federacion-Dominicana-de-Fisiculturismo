const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/auth');

router.get('/', (req, res) => {
    res.render('index', { titulo: 'BatWeb - Inicio' });
});
  
router.get('/servicios', checkRole(['atleta', 'admin']), (req, res) => {
    res.render('servicios', { titulo: 'Servicios BatWeb' });
});

router.get('/jueces', checkRole(['general', 'juez', 'admin']), (req, res) => {
    res.render('jueces', { titulo: 'Comité de Jueces' });
});

router.get('/noticias', checkRole(['general', 'admin']), (req, res) => {
    res.render('noticias', { titulo: 'Noticias FDFF' });
});

router.get('/social', checkRole(['general', 'admin']), (req, res) => {
    res.render('social', { titulo: 'Federados Social' });
});

module.exports = router;
