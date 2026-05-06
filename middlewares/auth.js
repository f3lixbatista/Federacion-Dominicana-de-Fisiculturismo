const supabase = require('../supabaseClient');

const checkRole = (rolesPermitidos) => {
    return async (req, res, next) => {
        try {
            // 1. Intentar obtener el token de la cookie que creamos en el callback
            const token = req.cookies['sb-access-token'];
            
            if (!token) {
                console.log("🚫 No hay token en la cookie. Redirigiendo al login...");
                return res.redirect('/login');
            }

            // 2. Validar el token con Supabase para identificar al usuario
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            
            if (authError || !user) {
                console.log("❌ Token inválido o sesión expirada.");
                return res.redirect('/login');
            }

            // 3. Buscar el rol en la tabla 'profiles'
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError || !profile) {
                console.log("⚠️ Usuario autenticado pero sin perfil en la tabla 'profiles'.");
                return res.redirect('/login');
            }

            console.log(`✅ Acceso concedido - Usuario: ${user.email} | Rol: ${profile.role}`);

            // 4. Verificar si el rol tiene permiso o es admin
            if (rolesPermitidos.includes(profile.role) || profile.role === 'admin') {
                return next();
            } else {
                return res.status(403).render('404', { 
                    titulo: "Acceso Denegado", 
                    descripcion: "Tu rango actual no permite ver esta sección." 
                });
            }
        } catch (error) {
            console.error("🔥 Error crítico en el Middleware:", error);
            res.redirect('/login');
        }
    };
};

// LA LÍNEA QUE FALTABA:
module.exports = { checkRole };
