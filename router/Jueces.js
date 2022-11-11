const express = require('express');
const router = express.Router();



router.get('/jueces', (req, res) => {
    res.render('jueces')

})
  
module.exports = router;