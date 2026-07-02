/**
 * seeds/testVotos.js
 * Crea 5 jueces de prueba, un panel, simula la votación completa
 * y oficializa todas las categorías del evento de prueba.
 *
 * Requiere que testData.js haya corrido primero (lee seeds/.test-state.json).
 * Uso: node seeds/testVotos.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');
const votingService = require('../services/votingService');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '.test-state.json');

// ── Jueces de prueba ──────────────────────────────────────────────────────────
const JUECES_TEST = [
  { email: 'juez1.test@fdff.do', nombre: 'Antonio Peña (J1)',    idfdff: 'J-TEST-01' },
  { email: 'juez2.test@fdff.do', nombre: 'Carmen Batista (J2)',  idfdff: 'J-TEST-02' },
  { email: 'juez3.test@fdff.do', nombre: 'Pedro Liriano (J3)',   idfdff: 'J-TEST-03' },
  { email: 'juez4.test@fdff.do', nombre: 'Rosa Méndez (J4)',     idfdff: 'J-TEST-04' },
  { email: 'juez5.test@fdff.do', nombre: 'Víctor Durán (J5)',    idfdff: 'J-TEST-05' },
];
const PASSWORD_JUECES = 'TestJuez2026!';

/**
 * Genera votos realistas para N atletas y K jueces.
 * Se designa un "orden de mérito" y los jueces votan en
 * consecuencia con pequeñas variaciones (±1 posición para realismo).
 *
 * merito[0] = atleta que gana, merito[1] = segundo, etc.
 */
function generarVotos(atletaIds, juezIds, merito = null) {
  const n = atletaIds.length;
  const ordenMerito = merito || [...Array(n).keys()]; // [0,1,2,...] por defecto

  const votos = []; // { atletaId, juezId, posicion }

  juezIds.forEach((juezId, jIdx) => {
    // Copia del orden de mérito con pequeñas variaciones para los jueces
    let ordenJuez = [...ordenMerito];

    // Introduce una disensión: el 3er juez invierte los dos últimos puestos
    if (jIdx === 2 && n >= 2) {
      const last = ordenJuez.length - 1;
      [ordenJuez[last], ordenJuez[last - 1]] = [ordenJuez[last - 1], ordenJuez[last]];
    }

    // Asignar posiciones: el atleta en ordenJuez[0] recibe posición 1, etc.
    ordenJuez.forEach((atletaIdx, posicion) => {
      votos.push({
        atletaId: atletaIds[atletaIdx],
        juezId,
        posicion: posicion + 1,
      });
    });
  });

  return votos;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🗳️   FDFF – Seed de votos y oficialización\n');

  // 0. Leer estado del seed anterior
  if (!fs.existsSync(STATE_FILE)) {
    console.error('❌ No se encontró seeds/.test-state.json');
    console.error('   Ejecuta primero: node seeds/testData.js\n');
    process.exit(1);
  }
  const { eventoId, evCatIds, atletaIdsPorCat } = JSON.parse(
    fs.readFileSync(STATE_FILE, 'utf-8')
  );
  console.log(`   Evento de prueba: ${eventoId}`);
  console.log(`   Categorías: ${evCatIds.length}  |  Atletas por cat: ${atletaIdsPorCat.map(a => a.length).join(', ')}`);

  // ── 1. Crear jueces (auth + profiles) ────────────────────────────────────
  console.log('\n1️⃣  Creando jueces de prueba...');
  const juezIds = [];

  for (const juez of JUECES_TEST) {
    // Verificar si ya existe
    const { data: existing } = await supabaseAdmin
      .from('profiles').select('id').eq('email', juez.email).maybeSingle();

    if (existing) {
      console.log(`   ⚠️  ${juez.email} ya existe, reutilizando.`);
      juezIds.push(existing.id);
      continue;
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: eAuth } = await supabaseAdmin.auth.admin.createUser({
      email: juez.email,
      password: PASSWORD_JUECES,
      email_confirm: true,
    });
    if (eAuth) throw new Error(`auth juez (${juez.email}): ${eAuth.message}`);

    // Crear perfil
    const { error: eProf } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      email: juez.email,
      nombre: juez.nombre,
      role: 'juez',
      id_fdff: juez.idfdff,
    });
    if (eProf) throw new Error(`profile juez (${juez.email}): ${eProf.message}`);

    juezIds.push(authData.user.id);
    console.log(`   ✅ ${juez.nombre} (${authData.user.id.slice(0, 8)}...)`);
  }

  // ── 2. Crear panel de jueces ──────────────────────────────────────────────
  console.log('\n2️⃣  Creando panel de jueces...');

  const { data: panelExistente } = await supabaseAdmin
    .from('paneles_jueces').select('id').eq('id_evento', eventoId).maybeSingle();

  let panelId;
  if (panelExistente) {
    panelId = panelExistente.id;
    console.log(`   ⚠️  Panel ya existe: ${panelId}`);
  } else {
    const { data: panel, error: ePan } = await supabaseAdmin
      .from('paneles_jueces').insert({
        id_evento: eventoId,
        numero_panel: 1,
        cantidad_jueces: juezIds.length,
      }).select('id').single();
    if (ePan) throw new Error('panel: ' + ePan.message);
    panelId = panel.id;
    console.log(`   ✅ Panel creado: ${panelId}`);
  }

  // ── 3. Asignar jueces a sillas del panel ──────────────────────────────────
  console.log('\n3️⃣  Asignando sillas del panel...');

  // Limpiar sillas previas de este panel
  await supabaseAdmin.from('panel_sillas_jueces').delete().eq('panel_id', panelId);

  const sillasPayload = juezIds.map((juezId, idx) => ({
    panel_id: panelId,
    id_evento: eventoId,
    numero_silla: idx + 1,
    juez_id: juezId,
    es_presidente: idx === 0,  // El primer juez es presidente de mesa
  }));

  const { error: eSillas } = await supabaseAdmin
    .from('panel_sillas_jueces').insert(sillasPayload);
  if (eSillas) throw new Error('sillas: ' + eSillas.message);
  console.log(`   ✅ ${sillasPayload.length} sillas asignadas (Juez 1 = Presidente)`);

  // ── 4. Insertar votos por categoría ──────────────────────────────────────
  console.log('\n4️⃣  Simulando votación...');

  const FASE = 'final_r1'; // Todas estas categorías van directo a Final (≤6 atletas)

  for (let catIdx = 0; catIdx < evCatIds.length; catIdx++) {
    const evCatId = evCatIds[catIdx];
    const atletasEnCat = atletaIdsPorCat[catIdx];

    // Limpiar votos previos
    await supabaseAdmin.from('votaciones_jueces')
      .delete().eq('evento_cat_id', evCatId).eq('fase_competencia', FASE);

    // Orden de mérito: atleta 0 gana, atleta 1 queda segundo (dentro de cada cat)
    const merito = atletasEnCat.map((_, i) => i);
    const votos = generarVotos(atletasEnCat, juezIds, merito);

    const votosPayload = votos.map(v => ({
      id_evento: eventoId,
      evento_cat_id: evCatId,
      juez_id: v.juezId,
      atleta_id: v.atletaId,
      posicion_asignada: v.posicion,
      fase_competencia: FASE,
    }));

    const { error: eVotos } = await supabaseAdmin
      .from('votaciones_jueces').insert(votosPayload);
    if (eVotos) throw new Error(`votos cat ${catIdx + 1}: ` + eVotos.message);

    console.log(`   ✅ Cat ${catIdx + 1} — ${votosPayload.length} votos insertados (${atletasEnCat.length} atletas × ${juezIds.length} jueces)`);
  }

  // ── 5. Calcular y oficializar cada categoría ──────────────────────────────
  console.log('\n5️⃣  Ejecutando algoritmo IFBB y oficializando...');

  for (let catIdx = 0; catIdx < evCatIds.length; catIdx++) {
    const evCatId = evCatIds[catIdx];

    // Traer votos
    const { data: votosRaw } = await supabaseAdmin
      .from('votaciones_jueces').select('atleta_id, posicion_asignada')
      .eq('evento_cat_id', evCatId).eq('fase_competencia', FASE);

    // Agrupar por atleta
    const votosPorAtleta = {};
    (votosRaw || []).forEach(v => {
      if (!votosPorAtleta[v.atleta_id]) votosPorAtleta[v.atleta_id] = [];
      votosPorAtleta[v.atleta_id].push(v.posicion_asignada);
    });

    // Calcular posiciones
    const resultados = votingService.calcularPosicionesFinales(votosPorAtleta);

    // Oficializar: actualizar competidores
    for (const r of resultados) {
      await supabaseAdmin.from('competidores')
        .update({ posicion_final: r.lugarSugerido, puntos_totales: r.puntos })
        .eq('atleta_id', r.atleta_id)
        .eq('evento_cat_id', evCatId);
    }

    const ganador = resultados.find(r => r.lugarSugerido === 1);
    console.log(`   ✅ Cat ${catIdx + 1} oficializada — Ganador: atleta ${ganador?.atleta_id?.slice(0, 8)}... (${ganador?.puntos} pts limpios)`);
  }

  // ── 6. Verificar absolutos disponibles ───────────────────────────────────
  console.log('\n6️⃣  Verificando absolutos disponibles...');

  const { data: campeones } = await supabaseAdmin
    .from('competidores')
    .select('atleta_id, atletas(nombre), eventos_categorias(categorias(disciplina, modalidad, division))')
    .eq('id_evento', eventoId).eq('posicion_final', 1);

  const gruposAbs = {};
  (campeones || []).forEach(c => {
    const cat = c.eventos_categorias?.categorias || {};
    const key = `${cat.disciplina}|||${(cat.modalidad || '').toLowerCase()}`;
    if (!gruposAbs[key]) gruposAbs[key] = { disciplina: cat.disciplina, modalidad: cat.modalidad, count: 0, divisiones: [] };
    gruposAbs[key].count++;
    gruposAbs[key].divisiones.push(cat.division);
  });

  let hayAbsolutos = false;
  Object.values(gruposAbs).forEach(g => {
    if (g.count >= 2) {
      hayAbsolutos = true;
      console.log(`   🏆 ABSOLUTO DISPONIBLE: ${g.disciplina} (${g.modalidad}) — divisiones: ${g.divisiones.join(', ')}`);
    } else {
      console.log(`   ℹ️  Sin absoluto: ${g.disciplina} (${g.modalidad}) — solo 1 división (${g.divisiones[0]})`);
    }
  });

  if (!hayAbsolutos) console.log('   ℹ️  No hay absolutos disponibles en este evento.');

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('✅  SIMULACIÓN COMPLETA');
  console.log('═'.repeat(60));
  console.log(`
   Credenciales jueces de prueba (login en /login):
   ${JUECES_TEST.map(j => `${j.email}  /  ${PASSWORD_JUECES}`).join('\n   ')}

   Panel configurado: 5 jueces, silla 1 = Presidente de Mesa

   Rutas para revisar:
   → /estadisticas/gestion-absolutos/${eventoId}
   → /estadisticas/print-boletas/${eventoId}
   → /atletas/listado  (ver dorsales)
   → /eventos/${eventoId}/monitor-mc
   → /estadisticas/presidente-mesa/<eventoCatId>

   Limpieza: node seeds/limpiarPruebas.js
  `);
}

main().catch(err => {
  console.error('\n❌ Error en seed votos:', err.message);
  process.exit(1);
});
