const { supabase, supabaseAdmin } = require('../config/supabase');
const { cargarPermisos, getRoles, getCache, AREAS } = require('../services/permisosService');
const webpush = require('web-push');

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
        const { data: staff, error } = await supabaseAdmin
            .from('staff')
            .select(`
                id,
                nombre_completo,
                puesto_especifico,
                profiles ( role, email )
            `)
            .order('nombre_completo', { ascending: true });

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
        const { fecha } = req.query;
        const diaFiltro = fecha || new Date().toISOString().split('T')[0];
        const diaFiltroFin = diaFiltro + 'T23:59:59';

        const [{ data: pagos, error }, { data: inscripcionesHoy }] = await Promise.all([
            supabaseAdmin.from('pagos_globales')
                .select('monto, tipo_pago, profiles:registrado_por ( nombre )')
                .gte('created_at', diaFiltro)
                .lte('created_at', diaFiltroFin),
            supabaseAdmin.from('competidores')
                .select(`
                    atleta_id, id_evento, pago_validado,
                    atletas ( nombre ),
                    eventos ( nombre, costo_primera_cat, costo_adicional, costo_oferta_primera, costo_oferta_adicional, fecha_limite_oferta )
                `)
                .eq('pago_validado', true)
                .not('url_comprobante_pago', 'is', null)
                .gte('created_at', diaFiltro)
                .lte('created_at', diaFiltroFin)
        ]);

        if (error) throw error;

        // Agrupar pagos globales por staff/tipo
        const agrupado = (pagos || []).reduce((acc, p) => {
            const staffNombre = p.profiles?.nombre || 'Admin/Sistema';
            const clave = `${staffNombre}|${p.tipo_pago}`;
            if (!acc[clave]) acc[clave] = { staff_nombre: staffNombre, tipo_pago: p.tipo_pago, cantidad_transacciones: 0, total_recaudado: 0 };
            acc[clave].cantidad_transacciones++;
            acc[clave].total_recaudado += parseFloat(p.monto || 0);
            return acc;
        }, {});

        // Agrupar inscripciones por evento (estimado de monto según precio de 1ra categoría)
        const inscripcionesAgrupadas = (inscripcionesHoy || []).reduce((acc, c) => {
            const eventoNombre = c.eventos?.nombre || 'Evento';
            if (!acc[eventoNombre]) acc[eventoNombre] = { evento: eventoNombre, cantidad: 0 };
            acc[eventoNombre].cantidad++;
            return acc;
        }, {});

        res.render('admin/reporte_caja', {
            resumen: Object.values(agrupado),
            inscripciones: Object.values(inscripcionesAgrupadas),
            fecha: diaFiltro
        });
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
            consulta = consulta.or(`tipo_pago.ilike.%${query}%, metodo_pago.ilike.%${query}%`);
        }

        const [
            { data: pagos, error: errPagos },
            { data: todasInscripciones },
            { data: extras }
        ] = await Promise.all([
            consulta.order('fecha_pago', { ascending: false }),
            supabaseAdmin.from('competidores')
                .select(`
                    id, atleta_id, id_evento, created_at,
                    url_comprobante_pago, pago_validado, observaciones_pago,
                    fecha_subida_pago,
                    atletas!inner ( nombre, idfdff ),
                    eventos ( id, nombre, costo_primera_cat, costo_adicional, costo_oferta_primera, costo_oferta_adicional, fecha_limite_oferta )
                `)
                .not('url_comprobante_pago', 'is', null)
                .order('pago_validado', { ascending: true })
                .order('fecha_subida_pago', { ascending: false }),
            supabaseAdmin.from('evento_ingresos_extra')
                .select('*, eventos(nombre)')
                .ilike('concepto', `%${query || ''}%`)
                .order('created_at', { ascending: false })
        ]);

        if (errPagos) throw errPagos;

        // Filtrar inscripciones por nombre/idfdff si hay búsqueda
        const inscripciones = query
            ? (todasInscripciones || []).filter(i =>
                (i.atletas?.nombre || '').toLowerCase().includes(query.toLowerCase()) ||
                String(i.atletas?.idfdff || '').includes(query))
            : (todasInscripciones || []);

        const pendientes = inscripciones.filter(i => !i.pago_validado);
        const validados  = inscripciones.filter(i => i.pago_validado);

        // Membresías con comprobante de transferencia pendiente de validación
        const { data: membresiasPendientes } = await supabaseAdmin
            .from('atletas')
            .select('id, nombre, idfdff, email, celular, url_comprobante_membresia, fecha_subida_membresia, estatus_afiliacion')
            .not('url_comprobante_membresia', 'is', null)
            .eq('estatus_afiliacion', 'pendiente')
            .order('fecha_subida_membresia', { ascending: false });

        res.render('admin/auditoria_pagos', {
            pagos: pagos || [],
            pendientes,
            validados,
            extras: extras || [],
            totalPendientes: pendientes.length,
            membresiasPendientes: membresiasPendientes || [],
            query
        });
    } catch (e) {
        console.error("🔥 Error en auditoría de pagos:", e.message);
        res.redirect('/eventos/competencias');
    }
};

// ── GESTIÓN DE ROLES Y PERMISOS ──────────────────────────────────────────────

const verDashboardRoles = async (req, res) => {
    try {
        const roles = getRoles();
        const permisos = getCache();
        res.render('admin/roles', { roles, permisos, AREAS });
    } catch (error) {
        console.error('Error al cargar dashboard de roles:', error.message);
        res.status(500).send('Error al cargar roles.');
    }
};

const actualizarPermiso = async (req, res) => {
    const { rol_id, area, accion, valor } = req.body;
    const accionesValidas = ['ver', 'crear', 'editar', 'eliminar'];
    if (!accionesValidas.includes(accion))
        return res.status(400).json({ ok: false, error: 'Acción inválida' });

    const campo = `puede_${accion}`;
    const boolValor = valor === true || valor === 'true' || valor === 1 || valor === '1';

    try {
        const { data: existing } = await supabaseAdmin
            .from('rol_permisos')
            .select('id')
            .eq('rol_id', rol_id)
            .eq('area', area)
            .maybeSingle();

        if (existing) {
            await supabaseAdmin.from('rol_permisos')
                .update({ [campo]: boolValor })
                .eq('rol_id', rol_id)
                .eq('area', area);
        } else {
            await supabaseAdmin.from('rol_permisos')
                .insert([{ rol_id, area, [campo]: boolValor }]);
        }

        await cargarPermisos();
        res.json({ ok: true });
    } catch (error) {
        console.error('Error al actualizar permiso:', error.message);
        res.status(500).json({ ok: false, error: error.message });
    }
};

const crearRol = async (req, res) => {
    const { nombre, descripcion, color_badge } = req.body;
    if (!nombre) return res.status(400).json({ ok: false, error: 'El nombre es requerido' });

    try {
        const { data, error } = await supabaseAdmin
            .from('roles')
            .insert([{
                nombre: nombre.toLowerCase().trim(),
                descripcion: descripcion || '',
                color_badge: color_badge || 'secondary',
                es_sistema: false
            }])
            .select()
            .single();

        if (error) throw error;
        await cargarPermisos();
        res.json({ ok: true, rol: data });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

const eliminarRol = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: rol } = await supabaseAdmin
            .from('roles').select('es_sistema').eq('id', id).maybeSingle();

        if (rol?.es_sistema)
            return res.status(403).json({ ok: false, error: 'No se puede eliminar un rol del sistema.' });

        await supabaseAdmin.from('roles').delete().eq('id', id);
        await cargarPermisos();
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

const recargarPermisos = async (req, res) => {
    try {
        await cargarPermisos();
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// ── VALIDACIÓN DE COMPROBANTES DE PAGO ─────────────────────────────────────

const validarPagoInscripcion = async (req, res) => {
    const { competidor_id } = req.body;
    if (!competidor_id) return res.status(400).json({ ok: false, error: 'Falta competidor_id' });

    try {
        // Obtener datos del competidor (atleta + evento)
        const { data: comp, error: eComp } = await supabaseAdmin
            .from('competidores')
            .select('atleta_id, id_evento, uso_oferta, monto_total, fecha_subida_pago, atletas(nombre, email, celular), eventos(nombre, costo_primera_cat, costo_adicional, fecha_limite_oferta)')
            .eq('id', competidor_id)
            .single();

        if (eComp || !comp) return res.status(404).json({ ok: false, error: 'Competidor no encontrado' });

        const { atleta_id, id_evento } = comp;
        const fechaSubida    = comp.fecha_subida_pago ? new Date(comp.fecha_subida_pago) : new Date();
        const fechaLimite    = comp.eventos?.fecha_limite_oferta ? new Date(comp.eventos.fecha_limite_oferta) : null;
        const precioAjustado = comp.uso_oferta && fechaLimite && fechaSubida > fechaLimite;

        // Obtener todos los registros del atleta en ese evento (para actualizar todos)
        const { data: todosComp } = await supabaseAdmin
            .from('competidores')
            .select('id, monto_total, uso_oferta')
            .eq('atleta_id', atleta_id)
            .eq('id_evento', id_evento);

        let montoOriginalTotal = 0;
        let montoNuevoTotal    = 0;

        const actualizaciones = (todosComp || []).map((c, idx) => {
            montoOriginalTotal += parseFloat(c.monto_total || 0);
            const nuevoMonto = idx === 0
                ? (comp.eventos?.costo_primera_cat || c.monto_total)
                : (comp.eventos?.costo_adicional   || c.monto_total);
            montoNuevoTotal += precioAjustado ? nuevoMonto : parseFloat(c.monto_total || 0);

            return supabaseAdmin.from('competidores').update({
                pago_validado: true,
                ...(precioAjustado ? { uso_oferta: false, monto_total: nuevoMonto } : {})
            }).eq('id', c.id);
        });

        await Promise.all(actualizaciones);

        // Notificaciones por correo
        const email  = comp.atletas?.email;
        const nombre = comp.atletas?.nombre;
        const eventoNombre = comp.eventos?.nombre;
        const { notificarPrecioAjustado, notificarPagoValidado } = require('../services/emailService');

        if (precioAjustado) {
            notificarPrecioAjustado({
                email, nombre, eventoNombre,
                montoOriginal: montoOriginalTotal,
                montoNuevo:    montoNuevoTotal,
                celular:       comp.atletas?.celular
            }).catch(() => {});
        } else {
            notificarPagoValidado({ email, nombre, eventoNombre }).catch(() => {});
        }

        res.json({
            ok: true,
            precioAjustado,
            mensaje: precioAjustado
                ? `Pago validado. ⚠️ Precio ajustado de RD$${montoOriginalTotal.toLocaleString()} a RD$${montoNuevoTotal.toLocaleString()} (fuera de la ventana de oferta).`
                : '✅ Pago validado correctamente.'
        });
    } catch (err) {
        console.error('Error en validarPagoInscripcion:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
};

const rechazarPagoInscripcion = async (req, res) => {
    const { competidor_id, motivo } = req.body;
    if (!competidor_id) return res.status(400).json({ ok: false, error: 'Falta competidor_id' });

    try {
        const { data: comp } = await supabaseAdmin
            .from('competidores').select('atleta_id, id_evento').eq('id', competidor_id).single();

        await supabaseAdmin.from('competidores').update({
            url_comprobante_pago: null,
            pago_validado:        false,
            observaciones_pago:   motivo || 'Rechazado por el staff'
        }).eq('atleta_id', comp.atleta_id).eq('id_evento', comp.id_evento);

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

const validarPagoMembresia = async (req, res) => {
    const { atleta_id } = req.body;
    if (!atleta_id) return res.status(400).json({ ok: false, error: 'Falta atleta_id' });

    try {
        const { data: atleta } = await supabaseAdmin
            .from('atletas').select('nombre, email').eq('id', atleta_id).single();

        await supabaseAdmin.from('atletas').update({
            estatus_afiliacion:       'habilitado',
            fecha_ultima_renovacion:  new Date().getFullYear() + '-12-31'
        }).eq('id', atleta_id);

        const { notificarAfiliacionValidada } = require('../services/emailService');
        notificarAfiliacionValidada({ email: atleta?.email, nombre: atleta?.nombre }).catch(() => {});

        res.json({ ok: true, mensaje: '✅ Membresía activada correctamente.' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

const rechazarPagoMembresia = async (req, res) => {
    const { atleta_id, motivo } = req.body;
    if (!atleta_id) return res.status(400).json({ ok: false, error: 'Falta atleta_id' });

    try {
        await supabaseAdmin.from('atletas').update({
            url_comprobante_membresia: null,
            fecha_subida_membresia:    null
        }).eq('id', atleta_id);

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── CUENTAS BANCARIAS ────────────────────────────────────────────────────────
const listarCuentas = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('cuentas_bancarias')
            .select('*')
            .order('activa', { ascending: false })
            .order('banco', { ascending: true });
        if (error) throw error;
        res.json({ ok: true, cuentas: data || [] });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

const guardarCuenta = async (req, res) => {
    const { id, banco, numero_cuenta, tipo_cuenta, titular, moneda, identificacion, activa } = req.body;
    if (!banco || !numero_cuenta || !titular || !identificacion)
        return res.status(400).json({ ok: false, error: 'Campos requeridos incompletos' });

    const campos = { banco, numero_cuenta, tipo_cuenta: tipo_cuenta || 'corriente', titular, moneda: moneda || 'RD$', identificacion, activa: activa !== false };

    try {
        const { error } = id
            ? await supabaseAdmin.from('cuentas_bancarias').update(campos).eq('id', id)
            : await supabaseAdmin.from('cuentas_bancarias').insert(campos);
        if (error) throw error;
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

const eliminarCuenta = async (req, res) => {
    try {
        const { error } = await supabaseAdmin.from('cuentas_bancarias').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

const listarUsuariosConRol = async (req, res) => {
    try {
        const { data: usuarios, error } = await supabaseAdmin
            .from('profiles')
            .select('id, nombre, email, role, cedula, id_fdff')
            .order('nombre', { ascending: true })
            .limit(500);

        if (error) throw error;
        res.json({ ok: true, usuarios: usuarios || [] });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

const cambiarRolUsuario = async (req, res) => {
    const { user_id, nuevo_rol } = req.body;
    const rolesValidos = getRoles().map(r => r.nombre);
    if (!rolesValidos.includes(nuevo_rol))
        return res.status(400).json({ ok: false, error: 'Rol inválido' });

    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ role: nuevo_rol })
            .eq('id', user_id);

        if (error) throw error;
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
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
    verAuditoriaPagos,
    validarPagoInscripcion,
    rechazarPagoInscripcion,
    validarPagoMembresia,
    rechazarPagoMembresia,
    verDashboardRoles,
    actualizarPermiso,
    crearRol,
    eliminarRol,
    recargarPermisos,
    listarCuentas,
    guardarCuenta,
    eliminarCuenta,
    listarUsuariosConRol,
    cambiarRolUsuario,
};