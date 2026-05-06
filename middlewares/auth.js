// middlewares/auth.js
const supabase = require('../supabaseClient');

const checkRole = (rolesPermitidos) => {
    return async (req, res, next) => {
        // 1. Obtener la sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return res.redirect('/login');

        // 2. Consultar el rol del usuario en nuestra tabla 'profiles'
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (rolesPermitidos.includes(profile.role) || profile.role === 'admin') {
            next(); // Tiene permiso o es admin
        } else {
            res.status(403).render('403', { mensaje: "No tienes permiso para esta sección" });
        }
    };
};

module.exports = { checkRole };
