const express = require('express');
const routerAuth = express.Router();
const { getSessionCookieName } = require('../services/authService');
const { requireAuth } = require('../middlewares/auth');

// Ruta para mostrar la vista de Login (si no existe en otro lado)
routerAuth.get('/login', (req, res) => {
    res.render('vistas_auth/login');
});

// Vista para procesar el callback de Supabase (Google, Recovery, etc)
routerAuth.get('/auth/callback', (req, res) => {
    res.render('vistas_auth/callback');
});

// Vista para resetear contraseña (protegida por el middleware en el cliente)
routerAuth.get('/reset-password', (req, res) => {
    res.render('vistas_auth/reset-password');
});

// Cambiar contraseña (usuario autenticado)
routerAuth.get('/cambiar-contrasena', requireAuth, (req, res) => {
    res.render('vistas_auth/cambiar-contrasena', {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    });
});

// Ruta para guardar la sesión en una cookie segura
routerAuth.post('/set-session', (req, res) => {
    const { session } = req.body;
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    };

    if (session) {
        res.cookie('sb-access-token', session.access_token, { 
            ...cookieOptions, 
            maxAge: (session.expires_in || 3600) * 1000 
        });
    }
    res.sendStatus(200);
});

// Ruta para limpiar la sesión (Logout)
routerAuth.post('/clear-session', (req, res) => {
    const cookieOptions = {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    };

    res.clearCookie('sb-access-token', cookieOptions);
    res.clearCookie('sb-refresh-token', cookieOptions);
    const extraCookie = getSessionCookieName();
    if (extraCookie) res.clearCookie(extraCookie, cookieOptions);
    
    res.sendStatus(200);
});

module.exports = routerAuth;