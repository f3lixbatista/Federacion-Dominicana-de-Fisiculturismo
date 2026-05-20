const express = require('express');
const routerAuth = express.Router();

// Ruta para guardar la sesión en una cookie
routerAuth.post('/set-session', (req, res) => {
    const { session } = req.body;
    if (session) {
        // Guardamos el access_token en una cookie segura
        res.cookie('sb-access-token', session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: session.expires_in * 1000
        });
    }
    res.sendStatus(200);
});

// Ruta para limpiar la sesión (Logout)
routerAuth.post('/clear-session', (req, res) => {
    res.clearCookie('sb-access-token');
    res.sendStatus(200);
});

module.exports = routerAuth;