const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render("index", {titulo : "BatWeb"})
})
  
router.get('/servicios', (req, res) => {
      res.render("servicios", {tituloSevicios : "Servicios BatWeb"})
})

router.get('/jueces', (req, res) => {
    res.render('jueces')

})

router.get('/noticias', (req, res) => {
    res.render('noticias')

})


module.exports = router;


