/**
 * seeds/limpiarSim.js
 * Elimina todos los datos creados por simEvento.js.
 * Lee el ID del evento desde .sim-state.json.
 *
 * Uso: node seeds/limpiarSim.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');
const fs   = require('fs');
const path = require('path');

const STATE_FILE   = path.join(__dirname, '.sim-state.json');
const EVENTO_NOMBRE = 'Evento de Prueba';
const EMAIL_SUFFIX  = '.sim@fdff.do';

async function main() {
  console.log('\n🧹  FDFF – Limpieza de Simulación\n');

  // 0. Leer estado guardado
  let eventoId = null;
  if (fs.existsSync(STATE_FILE)) {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    eventoId = state.eventoId;
    console.log(`   Evento ID del estado: ${eventoId}`);
  } else {
    const { data: ev } = await supabaseAdmin
      .from('eventos').select('id').eq('nombre', EVENTO_NOMBRE).maybeSingle();
    if (ev) { eventoId = ev.id; console.log(`   Evento encontrado por nombre: ${eventoId}`); }
  }

  if (eventoId) {
    // Categorías del evento
    const { data: evCats } = await supabaseAdmin
      .from('eventos_categorias').select('id').eq('evento_id', eventoId);
    const evCatIds = (evCats || []).map(ec => ec.id);

    // votaciones_jueces
    const { error: eVot } = await supabaseAdmin
      .from('votaciones_jueces').delete().eq('id_evento', eventoId);
    console.log('   🗑️  votaciones_jueces:', eVot ? '❌ ' + eVot.message : '✅');

    // pre_seleccion_top5 (si existe la tabla)
    if (evCatIds.length > 0) {
      await supabaseAdmin.from('pre_seleccion_top5').delete().in('evento_cat_id', evCatIds)
        .then(() => {}).catch(() => {});
    }

    // panel_sillas_jueces
    const { error: eSillas } = await supabaseAdmin
      .from('panel_sillas_jueces').delete().eq('id_evento', eventoId);
    console.log('   🗑️  panel_sillas_jueces:', eSillas ? '❌ ' + eSillas.message : '✅');

    // paneles_jueces
    const { error: ePan } = await supabaseAdmin
      .from('paneles_jueces').delete().eq('id_evento', eventoId);
    console.log('   🗑️  paneles_jueces:', ePan ? '❌ ' + ePan.message : '✅');

    // competidores
    const { error: eComp } = await supabaseAdmin
      .from('competidores').delete().eq('id_evento', eventoId);
    console.log('   🗑️  competidores:', eComp ? '❌ ' + eComp.message : '✅');

    // eventos_categorias
    const { error: eEC } = await supabaseAdmin
      .from('eventos_categorias').delete().eq('evento_id', eventoId);
    console.log('   🗑️  eventos_categorias:', eEC ? '❌ ' + eEC.message : '✅');

    // evento
    const { error: eEv } = await supabaseAdmin
      .from('eventos').delete().eq('id', eventoId);
    console.log('   🗑️  evento:', eEv ? '❌ ' + eEv.message : '✅');
  } else {
    console.log('   ℹ️  No se encontró el evento de prueba. Nada que limpiar.');
  }

  // Jueces de simulación
  console.log('\n   Limpiando jueces de simulación...');
  const { data: simProfiles } = await supabaseAdmin
    .from('profiles').select('id, email').like('email', `%${EMAIL_SUFFIX}`);

  for (const prof of (simProfiles || [])) {
    await supabaseAdmin.from('profiles').delete().eq('id', prof.id);
    const { error: eAuth } = await supabaseAdmin.auth.admin.deleteUser(prof.id);
    console.log(`   🗑️  ${prof.email}:`, eAuth ? '❌ ' + eAuth.message : '✅');
  }

  // Archivo de estado
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
    console.log('\n   🗑️  .sim-state.json eliminado');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅  LIMPIEZA COMPLETADA');
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('\n❌ Error en limpieza:', err.message);
  process.exit(1);
});
