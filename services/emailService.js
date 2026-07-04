/**
 * services/emailService.js
 * Notificaciones por correo. Requiere estas vars en .env:
 *   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, SMTP_FROM
 * Si no están configuradas, los emails se registran en consola (sin error fatal).
 */

let transporter = null;

function iniciarTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    try {
        const nodemailer = require('nodemailer');
        transporter = nodemailer.createTransport({
            host:   process.env.SMTP_HOST,
            port:   parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        console.log('✅ emailService: transporter SMTP listo');
    } catch (e) {
        console.warn('⚠️ emailService: nodemailer no disponible. npm install nodemailer');
    }
}

iniciarTransporter();

async function enviar({ para, asunto, html }) {
    if (!transporter || !para) {
        console.log(`📧 [EMAIL OMITIDO] Para: ${para} | Asunto: ${asunto}`);
        return;
    }
    try {
        await transporter.sendMail({
            from:    process.env.SMTP_FROM || 'FDFF <noreply@fdffrd.com>',
            to:      para,
            subject: asunto,
            html
        });
    } catch (err) {
        console.error('⚠️ emailService: error enviando email:', err.message);
    }
}

// ─── Plantillas ──────────────────────────────────────────────────────────────

async function notificarPrecioAjustado({ email, nombre, eventoNombre, montoOriginal, montoNuevo, celular }) {
    const diferencia = (montoNuevo - montoOriginal).toLocaleString('es-DO');
    await enviar({
        para: email,
        asunto: 'FDFF — Aviso: Precio de inscripción actualizado',
        html: `
            <h2 style="color:#dc3545">⚠️ Aviso de Ajuste de Precio</h2>
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            <p>Recibimos su comprobante de pago para <strong>${eventoNombre}</strong>.</p>
            <p>Sin embargo, la fecha del comprobante es <strong>posterior</strong> a la fecha límite del precio preferencial.</p>
            <table style="border-collapse:collapse;width:100%;max-width:400px">
              <tr><td style="padding:6px 12px;background:#f8f9fa">Precio preferencial</td>
                  <td style="padding:6px 12px">RD$ ${Number(montoOriginal).toLocaleString('es-DO')}</td></tr>
              <tr><td style="padding:6px 12px;background:#f8f9fa"><strong>Precio regular</strong></td>
                  <td style="padding:6px 12px;color:#dc3545"><strong>RD$ ${Number(montoNuevo).toLocaleString('es-DO')}</strong></td></tr>
            </table>
            <p style="margin-top:16px">Por favor complete el pago adicional de <strong>RD$ ${diferencia}</strong> para confirmar su inscripción.</p>
            <p>Para dudas, contáctenos directamente.</p>
            <hr><p style="font-size:11px;color:#aaa">Federación Dominicana de Fisiculturismo y Fitness</p>
        `
    });
    if (celular) console.log(`📱 [WHATSAPP PENDIENTE] ${celular} — precio ajustado evento ${eventoNombre}`);
}

async function notificarPagoValidado({ email, nombre, eventoNombre }) {
    await enviar({
        para: email,
        asunto: 'FDFF — ¡Inscripción confirmada!',
        html: `
            <h2 style="color:#198754">✅ Inscripción Confirmada</h2>
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            <p>Su pago para <strong>${eventoNombre}</strong> fue verificado. ¡Su inscripción está activa!</p>
            <hr><p style="font-size:11px;color:#aaa">Federación Dominicana de Fisiculturismo y Fitness</p>
        `
    });
}

async function notificarAfiliacionValidada({ email, nombre }) {
    await enviar({
        para: email,
        asunto: 'FDFF — ¡Membresía activada!',
        html: `
            <h2 style="color:#198754">✅ Membresía Activada</h2>
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            <p>Su comprobante fue verificado y su <strong>membresía FDFF está activa</strong>.</p>
            <p>¡Bienvenido/a a la federación!</p>
            <hr><p style="font-size:11px;color:#aaa">Federación Dominicana de Fisiculturismo y Fitness</p>
        `
    });
}

async function notificarComprobanteRecibido({ email, nombre, concepto }) {
    await enviar({
        para: email,
        asunto: `FDFF — Comprobante recibido: ${concepto}`,
        html: `
            <h2 style="color:#0d6efd">📄 Comprobante Recibido</h2>
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            <p>Recibimos su comprobante de pago para <strong>${concepto}</strong>.</p>
            <p>Nuestro equipo lo revisará en breve y le notificaremos la confirmación.</p>
            <hr><p style="font-size:11px;color:#aaa">Federación Dominicana de Fisiculturismo y Fitness</p>
        `
    });
}

module.exports = {
    notificarPrecioAjustado,
    notificarPagoValidado,
    notificarAfiliacionValidada,
    notificarComprobanteRecibido
};
