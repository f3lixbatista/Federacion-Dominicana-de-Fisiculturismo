const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render("index", {titulo : "BatWeb"})
})
  
router.get('/servicios', (req, res) => {
      res.render("servicios", {tituloSevicios : "Servicios BatWeb"})
})



module.exports = router;


