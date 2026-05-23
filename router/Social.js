const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');
const { requireAuth, checkRole } = require('../middlewares/auth');
const webpush = require('web-push');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Redirección de la raíz /social al muro
router.get('/', (req, res) => {
    res.redirect('/social/muro');
});

// Nueva ruta para ver la Directiva (Antiguo social.ejs)
router.get('/directiva', (req, res) => {
    res.render('social/miembros', { user: res.locals.user });
});

router.get('/muro', async (req, res) => {
    try {
        // Traemos las publicaciones unidas con los nombres de atletas y eventos
        const { data: publicaciones, error } = await supabaseAdmin
            .from('publicaciones_muro')
            .select(`
                *,
                profiles:atleta_id (nombre),
                eventos:evento_id (nombre)
            `)
            .order('fecha_publicacion', { ascending: false });

        if (error) throw error;

        res.render('social/muro', { 
            publicaciones: publicaciones || [],
            user: res.locals.user 
        });
    } catch (error) {
        console.error("🔥 Error en muro:", error.message);
        res.status(500).send("Error en Muro Social: " + error.message);
    }
});

// 1. Vista del Formulario (Solo accesible para Staff)
router.get('/noticias/crear', requireAuth, checkRole(['admin', 'ejecutivo']), (req, res) => {
    res.render('social/admin_noticias', { user: res.locals.user });
});

// Ver el feed de noticias dinámico
router.get('/noticias', async (req, res) => {
    try {
        const { data: noticias, error } = await supabaseAdmin
            .from('noticias')
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;

        res.render('social/noticias', { 
            noticias: noticias || [],
            user: res.locals.user 
        });
    } catch (error) {
        console.error("🔥 Error cargando noticias:", error.message);
        res.status(500).send("Error en Noticias: " + error.message);
    }
});

// 2. Proceso de Guardado (POST Protegido con subida de imagen)
router.post('/noticias/guardar', requireAuth, checkRole(['admin', 'ejecutivo']), upload.single('imagen'), async (req, res) => {
    const { titulo, contenido, es_destacada, imagen_url_manual } = req.body;
    let imagenUrl = null;

    try {
        if (req.file) {
            const file = req.file;
            const fileName = `${Date.now()}_noticia.jpg`;
            const filePath = `noticias/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('eventos-banners')
                .upload(filePath, file.buffer, { contentType: file.mimetype });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('eventos-banners').getPublicUrl(filePath);
            imagenUrl = urlData.publicUrl;
        } else if (imagen_url_manual) {
            imagenUrl = imagen_url_manual;
        }

        const { error: dbError } = await supabase
            .from('noticias')
            .insert({
                titulo,
                contenido,
                imagen_url: imagenUrl,
                es_destacada: es_destacada === 'on', // Manejo del Switch HTML
                autor_id: res.locals.user.id
            });

        if (dbError) throw dbError;

        // 3. DISPARAR NOTIFICACIÓN PUSH AUTOMÁTICA
        try {
            const payload = JSON.stringify({
                title: `📰 FDFF: ${titulo}`,
                body: contenido.substring(0, 100) + '...', // Resumen para la pantalla de bloqueo
                image: imagenUrl || 'https://fdffrd.com/img/fdff3.jpg', // Fallback al logo si no hay imagen
                url: '/social/noticias' 
            });

            // Usamos supabaseAdmin para obtener todas las suscripciones sin restricciones de RLS
            const { data: suscripciones } = await supabaseAdmin
                .from('notificaciones_suscripciones')
                .select('subscription_json');

            if (suscripciones && suscripciones.length > 0) {
                console.log(`📣 Difundiendo noticia a ${suscripciones.length} dispositivos...`);
                suscripciones.forEach(s => {
                    webpush.sendNotification(JSON.parse(s.subscription_json), payload)
                        .catch(err => {
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                console.log("🧹 Limpiando suscripción expirada.");
                                // Opcional: Eliminar la suscripción de la DB aquí
                            }
                        });
                });
            }
        } catch (pushErr) {
            console.error("⚠️ Error en motor de notificaciones:", pushErr.message);
            // No bloqueamos el redireccionamiento si el Push falla, la noticia ya se guardó.
        }

        res.redirect('/social/noticias');
    } catch (error) {
        console.error("🔥 Error publicando noticia:", error.message);
        res.status(500).send("Error al publicar: " + error.message);
    }
});

module.exports = router;