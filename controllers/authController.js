const supabase = require('../supabaseClient');
const { getSessionCookieName } = require('../services/authService');

const loginPage = (req, res) => {
    res.render('login', { error: null });
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data?.session) {
            throw error || new Error('No se pudo iniciar sesión');
        }

        const cookieName = getSessionCookieName();
        res.cookie(cookieName, data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 * 1000
        });

        console.log(`✅ Login exitoso para: ${email}`);
        return res.redirect('/eventos');
    } catch (error) {
        console.error('❌ Error de login:', error?.message || error);
        return res.render('login', { error: 'Correo o contraseña incorrectos' });
    }
};

const authCallback = (req, res) => {
    res.render('auth-callback', { user: null });
};

const logout = (req, res) => {
    const cookieName = getSessionCookieName();
    res.clearCookie(cookieName, { path: '/' });
    res.redirect('/login');
};

module.exports = {
    loginPage,
    login,
    authCallback,
    logout
};
