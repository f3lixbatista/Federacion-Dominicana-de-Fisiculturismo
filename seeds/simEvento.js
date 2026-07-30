/**
 * seeds/simEvento.js
 * Simulación completa de "Evento de Prueba" en producción FDFF.
 *
 * Crea el evento, inscribe atletas existentes, simula 7 jueces,
 * ejecuta el algoritmo IFBB y guarda el estado en .sim-state.json.
 *
 * Uso:    node seeds/simEvento.js
 * Limpia: node seeds/limpiarSim.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');
const votingService    = require('../services/votingService');
const fs   = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '.sim-state.json');

// ── Configuración ──────────────────────────────────────────────────────────
const EVENTO_NOMBRE = 'Evento de Prueba';
const FECHA_EVENTO  = '2026-08-15';
const FASE          = 'final_r1';
const PASSWORD_J    = 'SimJuez2026!';

const JUECES_SIM = [
  { email: 'juez1.sim@fdff.do', nombre: 'Roberto Álvarez (J1)',  idfdff: 'SJ-01' },
  { email: 'juez2.sim@fdff.do', nombre: 'Carmen Noboa (J2)',     idfdff: 'SJ-02' },
  { email: 'juez3.sim@fdff.do', nombre: 'Pedro Díaz (J3)',       idfdff: 'SJ-03' },
  { email: 'juez4.sim@fdff.do', nombre: 'Rosa Marte (J4)',       idfdff: 'SJ-04' },
  { email: 'juez5.sim@fdff.do', nombre: 'Víctor Lora (J5)',      idfdff: 'SJ-05' },
  { email: 'juez6.sim@fdff.do', nombre: 'Ana Méndez (J6)',       idfdff: 'SJ-06' },
  { email: 'juez7.sim@fdff.do', nombre: 'Luis Pichardo (J7)',    idfdff: 'SJ-07' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Genera votos con variaciones entre jueces.
 * El atleta en posición 0 del array normalmente gana.
 */
function generarVotos(atletaIds, juezIds) {
  const n = atletaIds.length;
  const votos = [];
  juezIds.forEach((juezId, jIdx) => {
    let orden = [...Array(n).keys()];
    // Jueces 3 y 6 invierten los dos últimos (disensión al fondo)
    if ((jIdx === 2 || jIdx === 5) && n >= 2) {
      [orden[n - 1], orden[n - 2]] = [orden[n - 2], orden[n - 1]];
    }
    // Juez 4 intercambia 2do y 3er puesto
    if (jIdx === 3 && n >= 3) {
      [orden[1], orden[2]] = [orden[2], orden[1]];
    }
    orden.forEach((atletaIdx, pos) => {
      votos.push({ atletaId: atletaIds[atletaIdx], juezId, posicion: pos + 1 });
    });
  });
  return votos;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🏆  FDFF – Simulación Completa de Evento de Prueba\n');
  const estado = { timestamp: new Date().toISOString() };

  // ── 1. Crear jueces ────────────────────────────────────────────────────
  console.log('1️⃣  Creando jueces de prueba...');
  const juezIds = [];
  for (const juez of JUECES_SIM) {
    const { data: existing } = await supabaseAdmin
      .from('profiles').select('id').eq('email', juez.email).maybeSingle();
    if (existing) {
      console.log(`   ⚠️  ${juez.email} ya existe, reutilizando.`);
      juezIds.push(existing.id);
      continue;
    }
    const { data: authData, error: eAuth } = await supabaseAdmin.auth.admin.createUser({
      email: juez.email,
      password: PASSWORD_J,
      email_confirm: true,
    });
    if (eAuth) throw new Error(`auth juez ${juez.email}: ${eAuth.message}`);
    const { error: eProf } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email: juez.email,
      nombre: juez.nombre,
      role: 'juez',
      id_fdff: juez.idfdff,
    }, { onConflict: 'id' });
    if (eProf) throw new Error(`profile ${juez.email}: ${eProf.message}`);
    juezIds.push(authData.user.id);
    console.log(`   ✅ ${juez.nombre}`);
  }
  estado.juezIds = juezIds;
  estado.jueces  = JUECES_SIM.map(j => ({ email: j.email, password: PASSWORD_J }));

  // ── 2. Crear evento ────────────────────────────────────────────────────
  console.log('\n2️⃣  Creando evento...');
  let eventoId;
  const { data: evExiste } = await supabaseAdmin
    .from('eventos').select('id').eq('nombre', EVENTO_NOMBRE).maybeSingle();
  if (evExiste) {
    eventoId = evExiste.id;
    console.log(`   ⚠️  Evento ya existe: ${eventoId}`);
  } else {
    const { data: nuevoEv, error: eEv } = await supabaseAdmin
      .from('eventos').insert([{
        nombre:           EVENTO_NOMBRE,
        fecha_inicio:     FECHA_EVENTO,
        lugar:            'Palacio de los Deportes (Simulación)',
        direccion:        'Av. John F. Kennedy s/n, Santo Domingo',
        costo_primera_cat: 0,
        costo_adicional:   0,
        estado:           'inscripcion',
        info_pesaje:      'Evento de prueba generado automáticamente por el sistema FDFF.',
      }]).select('id').single();
    if (eEv) throw new Error('Crear evento: ' + eEv.message);
    eventoId = nuevoEv.id;
    console.log(`   ✅ Evento creado: ${eventoId}`);
  }
  estado.eventoId    = eventoId;
  estado.eventoNombre = EVENTO_NOMBRE;

  // ── 3. Vincular categorías ─────────────────────────────────────────────
  console.log('\n3️⃣  Vinculando categorías...');
  const { data: todasLasCats, error: eCats } = await supabaseAdmin
    .from('categorias').select('id, nombre, sexo, modalidad, disciplina');
  if (eCats) throw new Error('Categorías: ' + eCats.message);

  await supabaseAdmin.from('eventos_categorias').delete().eq('evento_id', eventoId);

  if (todasLasCats && todasLasCats.length > 0) {
    const vinculos = todasLasCats.map((cat, idx) => ({
      evento_id: eventoId,
      categoria_id: cat.id,
      orden_secuencia_categoria: idx + 1,
    }));
    const { error: eVin } = await supabaseAdmin.from('eventos_categorias').insert(vinculos);
    if (eVin) throw new Error('Vincular categorías: ' + eVin.message);
    console.log(`   ✅ ${vinculos.length} categorías vinculadas`);
  }

  const { data: evCatsData } = await supabaseAdmin
    .from('eventos_categorias')
    .select('id, categoria_id, categorias(id, nombre, sexo, modalidad, disciplina)')
    .eq('evento_id', eventoId);
  const evCats = evCatsData || [];
  console.log(`   ✅ ${evCats.length} eventos_categorias confirmados`);

  // ── 4. Inscribir atletas ───────────────────────────────────────────────
  console.log('\n4️⃣  Inscribiendo atletas...');
  const { data: atletasMasc } = await supabaseAdmin
    .from('atletas').select('id, nombre, sexo, peso, estatura');
    // sin filtro de sexo aún, filtramos abajo

  const masc = (atletasMasc || []).filter(a => a.sexo === 'M');
  const fem  = (atletasMasc || []).filter(a => a.sexo === 'F');
  console.log(`   Atletas M: ${masc.length}  |  F: ${fem.length}`);

  if (masc.length < 2 && fem.length < 2) {
    throw new Error('No hay suficientes atletas en la BD para simular el evento.');
  }

  await supabaseAdmin.from('competidores').delete().eq('id_evento', eventoId);

  let dorsalGlobal = 1;
  const catReport  = []; // Para el reporte
  // Ofsets rotativos para variar quién gana en cada categoría
  const offsets = { M: 0, F: 0, 'F-M': 0 };

  for (const evCat of evCats) {
    const catInfo = evCat.categorias || {};
    const sexoCat = catInfo.sexo || 'M';

    let pool = [];
    if (sexoCat === 'F')   pool = fem;
    else if (sexoCat === 'M') pool = masc;
    else pool = [...masc, ...fem]; // F-M

    if (pool.length < 2) continue;

    // Rotar pool para variar al ganador por categoría
    const off = offsets[sexoCat] % pool.length;
    offsets[sexoCat]++;
    const rotated = [...pool.slice(off), ...pool.slice(0, off)];

    const cantidad = Math.min(8, rotated.length);
    const atletasAsignados = rotated.slice(0, cantidad);

    const rows = atletasAsignados.map(atl => ({
      atleta_id:      atl.id,
      evento_cat_id:  evCat.id,
      id_evento:      eventoId,
      estatus_pesaje: 'aprobado',
      salida:         0,
      monto_total:    0,
      uso_oferta:     false,
      numero_atleta:  dorsalGlobal++,
    }));

    const { error: eIns } = await supabaseAdmin.from('competidores').insert(rows);
    if (eIns) {
      console.error(`   ⚠️  Cat "${catInfo.nombre}": ${eIns.message}`);
      continue;
    }

    catReport.push({
      evCatId:   evCat.id,
      nombre:    catInfo.nombre,
      sexo:      sexoCat,
      modalidad: catInfo.modalidad,
      disciplina: catInfo.disciplina,
      atletaIds: atletasAsignados.map(a => a.id),
      atletaNombres: atletasAsignados.map(a => a.nombre),
    });
  }

  console.log(`   ✅ ${catReport.length} categorías inscritas (${dorsalGlobal - 1} inscripciones)`);
  estado.totalCategorias    = catReport.length;
  estado.totalInscripciones = dorsalGlobal - 1;

  // ── 5. Panel de jueces ─────────────────────────────────────────────────
  console.log('\n5️⃣  Creando panel...');
  await supabaseAdmin.from('panel_sillas_jueces').delete().eq('id_evento', eventoId);
  await supabaseAdmin.from('paneles_jueces').delete().eq('id_evento', eventoId);

  const { data: panel, error: ePan } = await supabaseAdmin
    .from('paneles_jueces').insert({
      id_evento:       eventoId,
      numero_panel:    1,
      cantidad_jueces: juezIds.length,
    }).select('id').single();
  if (ePan) throw new Error('Panel: ' + ePan.message);

  const sillas = juezIds.map((jId, idx) => ({
    panel_id:    panel.id,
    id_evento:   eventoId,
    numero_silla: idx + 1,
    juez_id:     jId,
    es_presidente: idx === 0,
  }));
  const { error: eSillas } = await supabaseAdmin.from('panel_sillas_jueces').insert(sillas);
  if (eSillas) throw new Error('Sillas: ' + eSillas.message);
  console.log(`   ✅ Panel con ${juezIds.length} jueces (J1 = Presidente de Mesa)`);
  estado.panelId = panel.id;

  // ── 6. Votaciones ─────────────────────────────────────────────────────
  console.log('\n6️⃣  Simulando votaciones...');
  await supabaseAdmin.from('votaciones_jueces').delete().eq('id_evento', eventoId);

  let votosTotal = 0;
  for (const cat of catReport) {
    const votos = generarVotos(cat.atletaIds, juezIds);
    const payload = votos.map(v => ({
      id_evento:          eventoId,
      evento_cat_id:      cat.evCatId,
      juez_id:            v.juezId,
      atleta_id:          v.atletaId,
      posicion_asignada:  v.posicion,
      fase_competencia:   FASE,
    }));
    const { error: eVot } = await supabaseAdmin.from('votaciones_jueces').insert(payload);
    if (eVot) { console.error(`   ⚠️  Votos "${cat.nombre}": ${eVot.message}`); continue; }
    votosTotal += payload.length;
  }
  console.log(`   ✅ ${votosTotal} votos insertados`);
  estado.totalVotos = votosTotal;

  // ── 7. Algoritmo IFBB + posiciones finales ─────────────────────────────
  console.log('\n7️⃣  Ejecutando algoritmo IFBB...');
  const resultadosReport = [];

  for (const cat of catReport) {
    const { data: votosRaw } = await supabaseAdmin
      .from('votaciones_jueces')
      .select('atleta_id, posicion_asignada')
      .eq('evento_cat_id', cat.evCatId)
      .eq('fase_competencia', FASE);

    const votosPorAtleta = {};
    (votosRaw || []).forEach(v => {
      if (!votosPorAtleta[v.atleta_id]) votosPorAtleta[v.atleta_id] = [];
      votosPorAtleta[v.atleta_id].push(v.posicion_asignada);
    });

    if (!Object.keys(votosPorAtleta).length) continue;

    const resultados = votingService.calcularPosicionesFinales(votosPorAtleta);

    for (const r of resultados) {
      await supabaseAdmin.from('competidores')
        .update({ posicion_final: r.lugarSugerido, puntos_totales: r.puntos })
        .eq('atleta_id', r.atleta_id)
        .eq('evento_cat_id', cat.evCatId);
    }

    const ganador = resultados.find(r => r.lugarSugerido === 1);
    resultadosReport.push({
      categoria: cat.nombre,
      sexo:      cat.sexo,
      modalidad: cat.modalidad,
      posiciones: resultados.slice(0, 5).map(r => ({
        pos:      r.lugarSugerido,
        pts:      r.puntos,
        atletaId: r.atleta_id,
        atleta:   cat.atletaNombres[cat.atletaIds.indexOf(r.atleta_id)] || '?',
      })),
      ganador: ganador ? (cat.atletaNombres[cat.atletaIds.indexOf(ganador.atleta_id)] || '?') : '?',
    });
  }

  console.log(`   ✅ Posiciones calculadas para ${resultadosReport.length} categorías`);
  estado.resultados = resultadosReport;

  // ── 8. Ranking de equipos ──────────────────────────────────────────────
  console.log('\n8️⃣  Calculando ranking de equipos...');
  const { data: compConPrep } = await supabaseAdmin
    .from('competidores')
    .select('posicion_final, es_ganador_absoluto, atletas(nombre, preparadores(nombre_completo))')
    .eq('id_evento', eventoId)
    .not('posicion_final', 'is', null);

  const rankingEquipos = votingService.calcularRankingEquipos(compConPrep || []);
  console.log(`   ✅ ${rankingEquipos.length} equipos en el ranking`);
  estado.rankingEquipos = rankingEquipos;

  // ── 9. Guardar estado para el reporte ──────────────────────────────────
  fs.writeFileSync(STATE_FILE, JSON.stringify(estado, null, 2), 'utf-8');
  console.log(`\n   📄 Estado guardado: ${STATE_FILE}`);

  // ── Resumen ────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('✅  SIMULACIÓN COMPLETADA');
  console.log('═'.repeat(60));
  console.log(`
   Evento ID: ${eventoId}
   URL: https://fdffrd.com/eventos/${eventoId}

   Categorías simuladas:  ${resultadosReport.length}
   Inscripciones totales: ${dorsalGlobal - 1}
   Votos insertados:      ${votosTotal}

   Credenciales de jueces (login en /login):
${JUECES_SIM.map(j => `     ${j.email}  /  ${PASSWORD_J}`).join('\n')}

   Ranking de equipos (top 5):
${rankingEquipos.slice(0, 5).map((e, i) => `     #${i + 1} ${e.nombre}: ${e.puntos} pts`).join('\n') || '     (sin equipos asignados a atletas aún)'}

   Limpieza: node seeds/limpiarSim.js
  `);
}

main().catch(err => {
  console.error('\n❌ Error en simulación:', err.message);
  console.error(err.stack);
  process.exit(1);
});
