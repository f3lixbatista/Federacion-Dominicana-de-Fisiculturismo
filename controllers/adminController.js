const { supabase, supabaseAdmin } = require('../supabaseClient');
const webpush = require('web-push'); // webpush is configured globally in app.js

const testPush = async (req, res) => {
    const { mensaje } = req.body;

    try {
        // 1. Buscamos todas las suscripciones registradas
        const { data: suscripciones, error } = await supabaseAdmin // Use supabaseAdmin to bypass RLS
            .from('notificaciones_suscripciones')
            .select('subscription_json');

        if (error) throw error;

        const payload = JSON.stringify({
            title: '📢 NOTICIA OFICIAL FDFF',
            body: mensaje,
            image: 'https://fdffrd.com/img/fdff3.jpg', // Imagen de prueba
            url: `${req.protocol}://${req.get('host')}/eventos/historico`
        });

        // 2. Envío asíncrono a todos los dispositivos
        let contador = 0;
        const promesas = (suscripciones || []).map(s => {
            return webpush.sendNotification(JSON.parse(s.subscription_json), payload)
                .then(() => contador++)
                .catch(err => console.error("Suscripción inválida o expirada:", err.endpoint, err.message));
        });

        await Promise.all(promesas);

        res.json({ ok: true, enviados: contador });
    } catch (err) {
        console.error("Error al enviar push de prueba:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
};

module.exports = {
    testPush
};