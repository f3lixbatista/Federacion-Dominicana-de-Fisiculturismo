/**
 * seeds/limpiarPruebas.js
 * Elimina TODOS los datos creados por testData.js y testVotos.js.
 * Borra en orden inverso de FK para evitar errores de restricción.
 *
 * Uso: node seeds/limpiarPruebas.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

const NOMBRE_EVENTO = '[PRUEBA] Campeonato Nacional Simulación 2026';
const CEDULA_PREFIX = '001-999';   // Cédulas de los atletas de prueba
const CEDULA_PREFIX2 = '402-999';  // Cédulas de los jóvenes Junior
const EMAIL_JUEZ_SUFFIX = '@fdff.do'; // Sufijo de los jueces de prueba
const NOMBRE_PREPARADOR = '[TEST] Coach Pedro Silvestre';

async function main() {
  console.log('\n🧹  FDFF – Limpieza de datos de prueba\n');

  // ── 1. Encontrar el evento de prueba ──────────────────────────────────────
  const { data: evento } = await supabaseAdmin
    .from('eventos').select('id').eq('nombre', NOMBRE_EVENTO).maybeSingle();

  if (!evento) {
    console.log('ℹ️  No se encontró el evento de prueba. Nada que limpiar.\n');
  } else {
    const eventoId = evento.id;
    console.log(`   Evento de prueba: ${eventoId}`);

    // Categorías del evento
    const { data: evCats } = await supabaseAdmin
      .from('eventos_categorias').select('id').eq('evento_id', eventoId);
    const evCatIds = (evCats || []).map(ec => ec.id);

    // 1a. pre_seleccion_top5
    if (evCatIds.length > 0) {
      const { error } = await supabaseAdmin
        .from('pre_seleccion_top5').delete().in('evento_cat_id', evCatIds);
      console.log('   🗑️  pre_seleccion_top5:', error ? '❌ ' + error.message : '✅');
    }

    // 1b. votaciones_jueces
    const { error: eVot } = await supabaseAdmin
      .from('votaciones_jueces').delete().eq('id_evento', eventoId);
    console.log('   🗑️  votaciones_jueces:', eVot ? '❌ ' + eVot.message : '✅');

    // 1c. panel_sillas_jueces
    const { error: eSillas } = await supabaseAdmin
      .from('panel_sillas_jueces').delete().eq('id_evento', eventoId);
    console.log('   🗑️  panel_sillas_jueces:', eSillas ? '❌ ' + eSillas.message : '✅');

    // 1d. paneles_jueces
    const { error: ePan } = await supabaseAdmin
      .from('paneles_jueces').delete().eq('id_evento', eventoId);
    console.log('   🗑️  paneles_jueces:', ePan ? '❌ ' + ePan.message : '✅');

    // 1e. competidores
    const { error: eComp } = await supabaseAdmin
      .from('competidores').delete().eq('id_evento', eventoId);
    console.log('   🗑️  competidores:', eComp ? '❌ ' + eComp.message : '✅');

    // 1f. eventos_categorias
    const { error: eEC } = await supabaseAdmin
      .from('eventos_categorias').delete().eq('evento_id', eventoId);
    console.log('   🗑️  eventos_categorias:', eEC ? '❌ ' + eEC.message : '✅');

    // 1g. Evento
    const { error: eEv } = await supabaseAdmin
      .from('eventos').delete().eq('id', eventoId);
    console.log('   🗑️  evento:', eEv ? '❌ ' + eEv.message : '✅');
  }

  // ── 2. Categorías de prueba ────────────────────────────────────────────────
  console.log('\n   Limpiando categorías [TEST]...');
  const { error: eCat } = await supabaseAdmin
    .from('categorias').delete().like('nombre', '[TEST]%');
  console.log('   🗑️  categorias:', eCat ? '❌ ' + eCat.message : '✅');

  // ── 3. Atletas de prueba ───────────────────────────────────────────────────
  console.log('\n   Limpiando atletas de prueba...');
  const { data: atletasBorrar } = await supabaseAdmin
    .from('atletas').select('id').or(`cedula.like.${CEDULA_PREFIX}%,cedula.like.${CEDULA_PREFIX2}%`);

  if (atletasBorrar && atletasBorrar.length > 0) {
    const atletaIds = atletasBorrar.map(a => a.id);
    // Limpiar competidores huérfanos que puedan quedar de otros eventos
    await supabaseAdmin.from('competidores').delete().in('atleta_id', atletaIds);
    const { error: eAt } = await supabaseAdmin
      .from('atletas').delete().in('id', atletaIds);
    console.log(`   🗑️  atletas (${atletasBorrar.length}):`, eAt ? '❌ ' + eAt.message : '✅');
  } else {
    console.log('   ℹ️  No se encontraron atletas de prueba.');
  }

  // ── 4. Preparador de prueba ────────────────────────────────────────────────
  console.log('\n   Limpiando preparador de prueba...');
  const { error: ePrep } = await supabaseAdmin
    .from('preparadores').delete().eq('nombre_completo', NOMBRE_PREPARADOR);
  console.log('   🗑️  preparador:', ePrep ? '❌ ' + ePrep.message : '✅');

  // ── 5. Jueces de prueba (auth + profiles) ────────────────────────────────
  console.log('\n   Limpiando jueces de prueba...');

  // Buscar jueces por email
  const EMAILS_JUECES = [
    'juez1.test@fdff.do', 'juez2.test@fdff.do', 'juez3.test@fdff.do',
    'juez4.test@fdff.do', 'juez5.test@fdff.do',
  ];

  for (const email of EMAILS_JUECES) {
    const { data: prof } = await supabaseAdmin
      .from('profiles').select('id').eq('email', email).maybeSingle();

    if (!prof) { console.log(`   ℹ️  ${email}: no encontrado`); continue; }

    // Borrar perfil
    await supabaseAdmin.from('profiles').delete().eq('id', prof.id);

    // Borrar usuario Auth
    const { error: eAuth } = await supabaseAdmin.auth.admin.deleteUser(prof.id);
    console.log(`   🗑️  ${email}:`, eAuth ? '❌ ' + eAuth.message : '✅');
  }

  // ── 6. Archivo de estado ──────────────────────────────────────────────────
  const stateFile = path.join(__dirname, '.test-state.json');
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
    console.log('\n   🗑️  .test-state.json eliminado');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅  LIMPIEZA COMPLETADA — Base de datos sin datos de prueba');
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('\n❌ Error en limpieza:', err.message);
  process.exit(1);
});
