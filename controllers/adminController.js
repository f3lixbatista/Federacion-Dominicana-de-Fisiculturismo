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

const verRecaudacionGeneral = async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        
        const { data: pagos } = await supabaseAdmin
            .from('pagos_globales')
            .select('monto, tipo_pago')
            .gte('created_at', hoy);

        const totales = (pagos || []).reduce((acc, p) => {
            if (p.tipo_pago === 'membresia_anual') acc.membresias += p.monto;
            if (p.tipo_pago === 'pase_backstage') acc.backstage += p.monto;
            return acc;
        }, { membresias: 0, backstage: 0 });

        res.render('admin/recaudacion_general', { 
            totalMembresias: totales.membresias, 
            totalBackstage: totales.backstage 
        });
    } catch (error) {
        res.redirect('/eventos/competencias');
    }
};

const registrarPagoManual = async (req, res) => {
    const { tipo_pago, identificador, monto } = req.body;
    try {
        await supabaseAdmin.from('pagos_globales').insert({
            tipo_pago,
            identificador_usuario: identificador,
            monto: parseFloat(monto),
            registrado_por: res.locals.user.id
        });
        res.redirect('/admin/recaudacion');
    } catch (error) {
        res.status(500).send("Error registrando pago.");
    }
};

const verRegistroStaff = async (req, res) => {
    try {
        // Traemos el personal unido con su rol desde la tabla profiles
        const { data: staff, error } = await supabaseAdmin
            .from('staff')
            .select(`
                id,
                nombre_completo,
                puesto_especifico,
                profiles ( role )
            `);

        if (error) throw error;

        res.render('admin/registro_staff', { personal: staff || [] });
    } catch (error) {
        console.error("Error al ver registro staff:", error.message);
        res.status(500).send("Error al cargar personal.");
    }
};

const guardarStaff = async (req, res) => {
    const { email, nombre, role, puesto } = req.body;
    try {
        // 1. Buscar el perfil por email para obtener su ID de Supabase Auth
        const { data: profile, error: errProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (errProfile || !profile) {
            return res.status(404).send("Usuario no encontrado. El correo debe estar previamente registrado en el sistema.");
        }

        // 2. Actualizar el rol en la tabla profiles (Elevación de privilegios)
        await supabaseAdmin.from('profiles').update({ role }).eq('id', profile.id);

        // 3. Registrar o actualizar datos específicos en la tabla de personal
        const { error: errStaff } = await supabaseAdmin
            .from('staff')
            .upsert({
                id: profile.id,
                nombre_completo: nombre,
                puesto_especifico: puesto
            });

        if (errStaff) throw errStaff;

        res.redirect('/admin/registro_staff');
    } catch (error) {
        console.error("Error al guardar staff:", error.message);
        res.status(500).send("Error al procesar el registro de staff.");
    }
};

const eliminarStaff = async (req, res) => {
    const { id } = req.params;
    try {
        // Devolvemos el perfil a rol 'general' y quitamos de la lista de staff activo
        await supabaseAdmin.from('profiles').update({ role: 'general' }).eq('id', id);
        await supabaseAdmin.from('staff').delete().eq('id', id);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

const verReporteCaja = async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        
        // Consultamos los pagos del día incluyendo el nombre de quien registró
        const { data: pagos, error } = await supabaseAdmin
            .from('pagos_globales')
            .select(`
                monto,
                tipo_pago,
                profiles:registrado_por ( nombre )
            `)
            .gte('created_at', hoy);

        if (error) throw error;

        // Agrupamos la data para el reporte (Staff + Tipo Pago)
        const agrupado = (pagos || []).reduce((acc, p) => {
            const staffNombre = p.profiles?.nombre || 'Admin/Sistema';
            const clave = `${staffNombre}-${p.tipo_pago}`;
            
            if (!acc[clave]) {
                acc[clave] = {
                    staff_nombre: staffNombre,
                    tipo_pago: p.tipo_pago,
                    cantidad_transacciones: 0,
                    total_recaudado: 0
                };
            }
            
            acc[clave].cantidad_transacciones++;
            acc[clave].total_recaudado += p.monto;
            return acc;
        }, {});

        res.render('admin/reporte_caja', { resumen: Object.values(agrupado) });
    } catch (error) {
        console.error("Error en reporte de caja:", error.message);
        res.status(500).send("Error al generar el reporte de caja.");
    }
};

const verAuditoriaPagos = async (req, res) => {
    const { query } = req.query;

    try {
        let consulta = supabaseAdmin.from('pagos_administrativos').select(`
            *,
            profiles:usuario_id (nombre, id_fdff, cedula)
        `);

        if (query) {
            // Buscador inteligente: Filtra por el tipo de pago o método de pago
            consulta = consulta.or(`tipo_pago.ilike.%${query}%, metodo_pago.ilike.%${query}%`);
        }

        const { data: pagos, error: errPagos } = await consulta.order('fecha_pago', { ascending: false });
        if (errPagos) throw errPagos;

        // Traemos las inscripciones de eventos que tienen comprobante de pago subido
        const { data: inscripciones } = await supabaseAdmin
            .from('competidores')
            .select(`
                id, atleta_id, created_at, url_comprobante_pago, pago_validado,
                atletas!inner ( nombre, idfdff ),
                eventos ( nombre )
            `)
            .not('url_comprobante_pago', 'is', null)
            .order('created_at', { ascending: false });

        // También traemos los ingresos extras para el buscador
        const { data: extras, error: errExtras } = await supabaseAdmin
            .from('evento_ingresos_extra')
            .select('*, eventos(nombre)')
            .ilike('concepto', `%${query || ''}%`);
        
        if (errExtras) throw errExtras;

        res.render('admin/auditoria_pagos', { 
            pagos: pagos || [], 
            inscripciones: inscripciones || [],
            extras: extras || [],
            query 
        });
    } catch (e) {
        console.error("🔥 Error en auditoría de pagos:", e.message);
        res.redirect('/eventos/competencias');
    }
};

module.exports = {
    testPush,
    verRecaudacionGeneral,
    registrarPagoManual,
    verRegistroStaff,
    guardarStaff,
    eliminarStaff,
    verReporteCaja,
    verAuditoriaPagos
};