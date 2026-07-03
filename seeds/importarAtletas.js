/**
 * seeds/importarAtletas.js
 * Importa atletas desde athletes_export_22.xlsx.
 * Flujo por atleta: auth.createUser → profiles.insert → atletas.insert
 * Omite cédulas ya existentes. Concurrencia de 5 para acelerar.
 *
 * Uso: node seeds/importarAtletas.js
 */

require('dotenv').config();
const XLSX = require('xlsx');
const path = require('path');
const { randomUUID } = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

const ARCHIVO          = path.join(__dirname, '..', 'athletes_export_22.xlsx');
const PASSWORD_DEFAULT = 'FDFFAtleta2026!';  // contraseña temporal para todos
const CONCURRENCIA     = 5;

function excelFecha(serial) {
    if (!serial || typeof serial !== 'number') return null;
    const d = new Date((serial - 25569) * 86400 * 1000);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function mapearSexo(valor) {
    const v = valor?.toString().trim().toLowerCase();
    if (v === 'male'   || v === 'm') return 'M';
    if (v === 'female' || v === 'f') return 'F';
    return null;
}

function extraerNumero(valor) {
    if (!valor) return null;
    const n = parseFloat(valor.toString().split(/[\s\/\-]/)[0]);
    return isNaN(n) ? null : n;
}

function emailGenerico(fdffId, cedula) {
    // Genera email único usando el número FDFF o la cédula normalizada
    if (fdffId) return `atleta.${fdffId}@fdffrd.com`.toLowerCase();
    return `atleta.${cedula.replace(/[^a-z0-9]/gi, '')}@fdffrd.com`.toLowerCase();
}

async function procesarAtleta(fila, idx) {
    const cedula  = fila['ID-Passport']?.toString().trim() || null;
    const fdffNum = fila['FDFF ID'];
    const idfdff  = fdffNum ? `FDFF-${fdffNum}` : null;
    const nombre  = fila['Full Name']?.toString().trim() || 'Sin nombre';
    const emailOriginal = fila['Email']?.toString().trim() || null;
    const email   = emailOriginal || emailGenerico(fdffNum, cedula);

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: PASSWORD_DEFAULT,
        email_confirm: true,
    });

    if (authError) {
        // Si el email ya existe en auth, intentar buscar el usuario existente
        if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
            return { ok: false, razon: `email duplicado en auth (${email})`, cedula };
        }
        return { ok: false, razon: authError.message, cedula };
    }

    const userId = authData.user.id;

    // 2. Crear perfil
    await supabaseAdmin.from('profiles').insert({
        id:     userId,
        email,
        nombre,
        role:   'atleta',
        id_fdff: idfdff,
    });

    // 3. Insertar atleta
    const { error: atError } = await supabaseAdmin.from('atletas').insert({
        id:                 userId,
        idfdff,
        nombre,
        cedula,
        celular:            fila['Phone']?.toString().trim() || null,
        municipio:          fila['City']?.toString().trim() || null,
        nacionalidad:       fila['Nationality']?.toString().trim() || null,
        fecha_nacimiento:   excelFecha(fila['Birth Date']),
        sexo:               mapearSexo(fila['Sex']),
        peso:               extraerNumero(fila['Weight kg-lb']),
        estatura:           extraerNumero(fila['Height cm-ft']),
        categoria:          fila['Category']?.toString().trim() || null,
        gimnasio:           fila['Gym']?.toString().trim() || null,
        preparador:         fila['Coach']?.toString().trim() || null,
        estatus_afiliacion: 'habilitado',
        fecha_ultima_renovacion: `${new Date().getFullYear()}-12-31`,
    });

    if (atError) {
        // Revertir: borrar el usuario auth creado
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return { ok: false, razon: atError.message, cedula };
    }

    return { ok: true, cedula, nombre };
}

async function main() {
    console.log('\n📋  FDFF – Importación de atletas desde Excel\n');

    // ── 1. Leer Excel ────────────────────────────────────────────────────────
    const wb    = XLSX.readFile(ARCHIVO);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(sheet, { defval: null });
    console.log(`   Archivo  : ${path.basename(ARCHIVO)}`);
    console.log(`   Filas    : ${filas.length}`);

    // ── 2. Obtener cédulas ya en BD ──────────────────────────────────────────
    const { data: existentes } = await supabaseAdmin.from('atletas').select('cedula');
    const cedulasExistentes = new Set((existentes || []).map(a => a.cedula?.trim()));
    console.log(`   En BD    : ${cedulasExistentes.size} atletas existentes\n`);

    // ── 3. Filtrar filas nuevas ──────────────────────────────────────────────
    const pendientes = [];
    let sinCedula = 0;

    for (const fila of filas) {
        const cedula = fila['ID-Passport']?.toString().trim();
        if (!cedula) { sinCedula++; continue; }
        if (cedulasExistentes.has(cedula)) continue;
        pendientes.push(fila);
        cedulasExistentes.add(cedula); // evitar duplicados dentro del Excel
    }

    console.log(`   Nuevos   : ${pendientes.length}`);
    console.log(`   Omitidos : ${filas.length - pendientes.length - sinCedula} (duplicados) + ${sinCedula} (sin cédula)\n`);

    if (pendientes.length === 0) {
        console.log('ℹ️  No hay registros nuevos.\n');
        return;
    }

    // ── 4. Procesar con concurrencia ─────────────────────────────────────────
    let insertados = 0;
    let errores    = 0;
    const fallos   = [];

    for (let i = 0; i < pendientes.length; i += CONCURRENCIA) {
        const lote = pendientes.slice(i, i + CONCURRENCIA);
        const resultados = await Promise.allSettled(lote.map((fila, j) => procesarAtleta(fila, i + j)));

        for (const r of resultados) {
            const val = r.status === 'fulfilled' ? r.value : { ok: false, razon: r.reason?.message || 'Error' };
            if (val.ok) {
                insertados++;
            } else {
                errores++;
                fallos.push(val);
            }
        }

        process.stdout.write(`\r   Progreso: ${insertados + errores}/${pendientes.length} (✅ ${insertados}  ❌ ${errores})`);
    }

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('✅  IMPORTACIÓN COMPLETADA');
    console.log(`   Insertados : ${insertados}`);
    console.log(`   Errores    : ${errores}`);
    if (fallos.length > 0) {
        console.log('\n   Primeros fallos:');
        fallos.slice(0, 10).forEach(f => console.log(`   • ${f.cedula} — ${f.razon}`));
        if (fallos.length > 10) console.log(`   ... y ${fallos.length - 10} más`);
    }
    console.log('═'.repeat(60));
    console.log(`\n   Contraseña temporal: ${PASSWORD_DEFAULT}`);
    console.log('   Los atletas pueden cambiarla en /login → "Olvidé mi contraseña"\n');
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
