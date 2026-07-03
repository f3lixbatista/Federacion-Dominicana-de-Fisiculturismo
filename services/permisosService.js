/**
 * services/permisosService.js
 * Cache en memoria de la matriz roles × áreas × acciones.
 * Se carga al arrancar el servidor y se recarga desde el dashboard
 * sin necesidad de reiniciar.
 *
 * Estructura del cache:
 *   {
 *     "admin":   { atletas: {ver,crear,editar,eliminar}, eventos: {...}, ... },
 *     "juez":    { ... },
 *     ...
 *   }
 */

const { supabaseAdmin } = require('../config/supabase');

let _cache = {};         // matriz en memoria
let _roles  = [];        // lista de roles completa

// ── Carga / recarga ──────────────────────────────────────────────────────────

async function cargarPermisos() {
    const { data: roles, error: eRoles } = await supabaseAdmin
        .from('roles')
        .select('id, nombre, descripcion, color_badge, es_sistema')
        .order('nombre');

    if (eRoles) {
        console.error('⚠️ permisosService: error cargando roles:', eRoles.message);
        return;
    }

    const { data: permisos, error: ePermisos } = await supabaseAdmin
        .from('rol_permisos')
        .select('rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar');

    if (ePermisos) {
        console.error('⚠️ permisosService: error cargando permisos:', ePermisos.message);
        return;
    }

    // Construir lookup rol_id → nombre
    const idANombre = {};
    roles.forEach(r => { idANombre[r.id] = r.nombre; });

    // Reconstruir cache
    const nuevo = {};
    roles.forEach(r => { nuevo[r.nombre] = {}; });

    (permisos || []).forEach(p => {
        const rolNombre = idANombre[p.rol_id];
        if (!rolNombre) return;
        nuevo[rolNombre][p.area] = {
            ver:      p.puede_ver,
            crear:    p.puede_crear,
            editar:   p.puede_editar,
            eliminar: p.puede_eliminar,
        };
    });

    _cache = nuevo;
    _roles  = roles;
    console.log(`✅ permisosService: ${roles.length} roles, ${permisos.length} permisos cargados`);
}

// ── Consultas ────────────────────────────────────────────────────────────────

/**
 * Verifica si un rol tiene permiso para una acción en un área.
 * El admin siempre tiene acceso total (cortocircuito).
 */
function tienePermiso(rolNombre, area, accion = 'ver') {
    if (rolNombre === 'admin') return true;
    return !!_cache[rolNombre]?.[area]?.[accion];
}

function getRoles()  { return _roles; }
function getCache()  { return _cache; }

// ── Áreas definidas en el sistema ────────────────────────────────────────────
const AREAS = [
    { key: 'atletas',      label: 'Atletas',       icono: 'fas fa-users' },
    { key: 'eventos',      label: 'Eventos',        icono: 'fas fa-trophy' },
    { key: 'inscripcion',  label: 'Inscripción',    icono: 'fas fa-clipboard-list' },
    { key: 'estadisticas', label: 'Estadísticas',   icono: 'fas fa-chart-bar' },
    { key: 'categorias',   label: 'Categorías',     icono: 'fas fa-tags' },
    { key: 'social',       label: 'Social',         icono: 'fas fa-comments' },
    { key: 'preparadores', label: 'Preparadores',   icono: 'fas fa-user-tie' },
    { key: 'fotografo',    label: 'Fotografía',     icono: 'fas fa-camera' },
    { key: 'broadcast',    label: 'Broadcast / DJ', icono: 'fas fa-broadcast-tower' },
    { key: 'backstage',    label: 'Backstage',      icono: 'fas fa-door-open' },
    { key: 'admin',        label: 'Administración', icono: 'fas fa-shield-alt' },
    // ── Día del Evento ──────────────────────────────────────────────────
    { key: 'pesaje',       label: 'Pesaje / Reg. Asistido',    icono: 'fas fa-weight' },
    { key: 'panel_jueces', label: 'Panel de Jueces',            icono: 'fas fa-gavel' },
    { key: 'preparacion',  label: 'Preparación Evento',         icono: 'fas fa-clipboard-check' },
    { key: 'programa',     label: 'Programa de Competencia',    icono: 'fas fa-list-ol' },
    // ── Mesa Técnica ─────────────────────────────────────────────────────
    { key: 'computo',      label: 'Mesa Técnica / Cómputo',    icono: 'fas fa-calculator' },
    { key: 'reportes',     label: 'Reportes y Diplomas',        icono: 'fas fa-file-alt' },
    { key: 'cierre',       label: 'Cerrar Competencia',         icono: 'fas fa-flag-checkered' },
    { key: 'finanzas',     label: 'Finanzas / Caja',            icono: 'fas fa-cash-register' },
    // ── Producción de Espectáculo ────────────────────────────────────────
    { key: 'produccion',   label: 'Producción',                 icono: 'fas fa-film' },
    { key: 'dj',           label: 'DJ Virtual',                 icono: 'fas fa-music' },
    { key: 'vmd',          label: 'Panel VMD',                  icono: 'fas fa-tv' },
    { key: 'monitor_mc',   label: 'Monitor MC',                 icono: 'fas fa-microphone' },
    // ── Comunicación y Gestión ───────────────────────────────────────────
    { key: 'noticias',     label: 'Noticias Oficiales',         icono: 'fas fa-newspaper' },
    { key: 'staff',        label: 'Gestión de Staff',           icono: 'fas fa-users-cog' },
    { key: 'notificaciones', label: 'Notificaciones Push',      icono: 'fas fa-bell' },
    { key: 'ranking',      label: 'Ranking Teams',              icono: 'fas fa-medal' },
];

module.exports = { cargarPermisos, tienePermiso, getRoles, getCache, AREAS };
