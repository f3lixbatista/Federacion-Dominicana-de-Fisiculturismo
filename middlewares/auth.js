const supabase = require('../supabaseClient');

const checkRole = (rolesPermitidos) => {
    return async (req, res, next) => {
        try {
            // 1. Intentar obtener la sesión
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                console.log("No hay sesión activa en el servidor.");
                return res.redirect('/login');
            }

            // 2. Consultar el rol del usuario
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile) {
                console.log("Error al obtener el perfil o perfil inexistente.");
                return res.redirect('/login');
            }

            console.log("Rol detectado en el servidor:", profile.role);

            // 3. Verificar permisos
            if (rolesPermitidos.includes(profile.role) || profile.role === 'admin') {
                return next(); // Importante el 'return' para no seguir ejecutando
            } else {
                return res.status(403).render('404', { 
                    titulo: "403 - Acceso Denegado", 
                    descripcion: "Tu rol actual (" + profile.role + ") no tiene permiso aquí." 
                });
            }
        } catch (error) {
            console.error("Error inesperado en el middleware:", error);
            res.redirect('/login');
        }
    };
};

module.exports = { checkRole };
