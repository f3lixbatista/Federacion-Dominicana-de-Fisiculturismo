const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.loginPage);
router.post('/login', authController.login);
router.get('/auth/callback', authController.authCallback);
router.get('/logout', authController.logout);

module.exports = router;
