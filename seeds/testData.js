/**
 * seeds/testData.js
 * Crea datos de prueba: 12 atletas, 1 preparador, 6 categorías,
 * 1 evento completo con pesaje aprobado y dorsales asignados.
 *
 * Uso: node seeds/testData.js
 * Limpieza: node seeds/limpiarPruebas.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

// ── Marcador de datos de prueba ───────────────────────────────────────────────
const NOMBRE_EVENTO = '[PRUEBA] Campeonato Nacional Simulación 2026';

// ── Atletas ───────────────────────────────────────────────────────────────────
// Cédulas con prefijo 999 para identificarlos fácilmente y evitar colisiones
const ATLETAS = [
  // Senior Men's Bodybuilding – Lightweight (70–80 kg)
  { nombre: 'Carlos Martínez Reyes',  cedula: '001-9990001-1', sexo: 'M', fecha_nacimiento: '1992-03-15', estatura: 172, peso: 76.5, idfdff: 'FDFF-T001', gimnasio: 'Gym Power SD',  provincia: 'Santo Domingo' },
  { nombre: 'Rafael Díaz Santos',     cedula: '001-9990002-2', sexo: 'M', fecha_nacimiento: '1989-07-22', estatura: 170, peso: 78.0, idfdff: 'FDFF-T002', gimnasio: 'Iron House SD', provincia: 'Santo Domingo' },

  // Senior Men's Bodybuilding – Welterweight (80–90 kg)
  { nombre: 'José Fernández Ureña',   cedula: '001-9990003-3', sexo: 'M', fecha_nacimiento: '1990-11-08', estatura: 175, peso: 85.5, idfdff: 'FDFF-T003', gimnasio: 'Strength Zone', provincia: 'Santiago'      },
  { nombre: 'Miguel Rodríguez Peña',  cedula: '001-9990004-4', sexo: 'M', fecha_nacimiento: '1988-05-14', estatura: 178, peso: 88.0, idfdff: 'FDFF-T004', gimnasio: 'Gym Power SD',  provincia: 'Santo Domingo' },

  // Junior Men's Bodybuilding – Open (16–23 años)
  { nombre: 'Ángel Suárez Castro',    cedula: '402-9990005-5', sexo: 'M', fecha_nacimiento: '2004-08-20', estatura: 174, peso: 73.0, idfdff: 'FDFF-T005', gimnasio: 'Iron House SD', provincia: 'La Vega'       },
  { nombre: 'Luis Taveras Gómez',     cedula: '402-9990006-6', sexo: 'M', fecha_nacimiento: '2005-02-11', estatura: 171, peso: 71.5, idfdff: 'FDFF-T006', gimnasio: 'Pro Gym SDE',   provincia: 'San Pedro'     },

  // Senior Women's Bikini – Class A (≤163 cm)
  { nombre: 'María Elena Núñez',      cedula: '001-9990007-7', sexo: 'F', fecha_nacimiento: '1996-04-18', estatura: 160, peso: 52.0, idfdff: 'FDFF-T007', gimnasio: 'Body Fit STI',  provincia: 'Santiago'      },
  { nombre: 'Paola Jiménez Vargas',   cedula: '001-9990008-8', sexo: 'F', fecha_nacimiento: '1993-09-30', estatura: 162, peso: 54.5, idfdff: 'FDFF-T008', gimnasio: 'Gym Power SD',  provincia: 'Santo Domingo' },

  // Senior Women's Bikini – Class B (>163–168 cm)
  { nombre: 'Valentina Cruz López',   cedula: '001-9990009-9', sexo: 'F', fecha_nacimiento: '1997-12-05', estatura: 165, peso: 57.0, idfdff: 'FDFF-T009', gimnasio: 'Iron House SD', provincia: 'Santo Domingo' },
  { nombre: 'Diana Reyes Monción',    cedula: '001-9990010-0', sexo: 'F', fecha_nacimiento: '1994-06-22', estatura: 167, peso: 59.5, idfdff: 'FDFF-T010', gimnasio: 'Strength Zone', provincia: 'Santiago'      },

  // Senior Women's Wellness – Open
  { nombre: 'Samantha Peralta Roa',   cedula: '001-9990011-1', sexo: 'F', fecha_nacimiento: '1991-01-14', estatura: 163, peso: 63.0, idfdff: 'FDFF-T011', gimnasio: 'Body Fit STI',  provincia: 'Azua'          },
  { nombre: 'Génesis Marte Salcedo',  cedula: '001-9990012-2', sexo: 'F', fecha_nacimiento: '1995-10-28', estatura: 166, peso: 65.5, idfdff: 'FDFF-T012', gimnasio: 'Pro Gym SDE',   provincia: 'Santo Domingo' },
];

// ── Categorías ────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  // [0] → index en ATLETAS que compiten en ella (ver INSCRIPCIONES abajo)
  { nombre: "[TEST] Senior Men's Bodybuilding - Lightweight",  modalidad: 'Senior', disciplina: "Men's Bodybuilding", sexo: 'M', division: 'Lightweight',  peso_min: 70,  peso_max: 80  },
  { nombre: "[TEST] Senior Men's Bodybuilding - Welterweight", modalidad: 'Senior', disciplina: "Men's Bodybuilding", sexo: 'M', division: 'Welterweight', peso_min: 80,  peso_max: 90  },
  { nombre: "[TEST] Junior Men's Bodybuilding - Open",         modalidad: 'Junior', disciplina: "Men's Bodybuilding", sexo: 'M', division: 'Open',         edad_min: 16,  edad_max: 23  },
  { nombre: "[TEST] Senior Women's Bikini - Class A",          modalidad: 'Senior', disciplina: "Women's Bikini",     sexo: 'F', division: 'Class A',      estatura_max: 163             },
  { nombre: "[TEST] Senior Women's Bikini - Class B",          modalidad: 'Senior', disciplina: "Women's Bikini",     sexo: 'F', division: 'Class B',      estatura_min: 163, estatura_max: 168 },
  { nombre: "[TEST] Senior Women's Wellness - Open",           modalidad: 'Senior', disciplina: "Women's Wellness",   sexo: 'F', division: 'Open'                                        },
];

// Atletas inscriptos por categoría (índices en ATLETAS)
const INSCRIPCIONES_POR_CAT = [
  [0, 1],    // Lightweight → Carlos, Rafael
  [2, 3],    // Welterweight → José, Miguel
  [4, 5],    // Junior → Ángel, Luis
  [6, 7],    // Bikini A → María Elena, Paola
  [8, 9],    // Bikini B → Valentina, Diana
  [10, 11],  // Wellness → Samantha, Génesis
];

// ── Preparador de prueba ──────────────────────────────────────────────────────
const PREPARADOR_TEST = {
  nombre_completo: '[TEST] Coach Pedro Silvestre',
  gimnasio_labora: 'Gym Power SD',
  estatus: 'habilitado',
  email: 'coach.test.fdff@test.do',
  celular: '809-999-0000',
};

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  FDFF – Seed de datos de prueba\n');

  // 0. Verificar si ya existe el evento de prueba
  const { data: eventoExistente } = await supabaseAdmin
    .from('eventos').select('id, nombre').eq('nombre', NOMBRE_EVENTO).maybeSingle();

  if (eventoExistente) {
    console.log(`⚠️  El evento de prueba ya existe (id: ${eventoExistente.id}).`);
    console.log('   Ejecuta primero: node seeds/limpiarPruebas.js\n');
    process.exit(0);
  }

  // ── 1. Preparador ─────────────────────────────────────────────────────────
  console.log('1️⃣  Creando preparador de prueba...');
  const { data: prep, error: ePr } = await supabaseAdmin
    .from('preparadores').insert(PREPARADOR_TEST).select('id').single();
  if (ePr) throw new Error('preparador: ' + ePr.message);
  const preparadorId = prep.id;
  console.log(`   ✅ Preparador creado: ${preparadorId}`);

  // ── 2. Atletas ────────────────────────────────────────────────────────────
  console.log('\n2️⃣  Creando atletas de prueba...');
  const atletasPayload = ATLETAS.map(a => ({
    ...a,
    estatus_afiliacion: 'habilitado',
    preparador_id: preparadorId,
    descargo_firmado: true,
    fecha_firma_descargo: new Date().toISOString(),
    pais: 'República Dominicana',
    nacionalidad: 'Dominicana',
  }));

  const { data: atletasCreados, error: eAt } = await supabaseAdmin
    .from('atletas').insert(atletasPayload).select('id, nombre, idfdff');
  if (eAt) throw new Error('atletas: ' + eAt.message);
  console.log(`   ✅ ${atletasCreados.length} atletas creados`);
  atletasCreados.forEach(a => console.log(`      • ${a.idfdff}  ${a.nombre}`));

  // ── 3. Categorías ─────────────────────────────────────────────────────────
  console.log('\n3️⃣  Creando categorías de prueba...');
  const { data: catsCreadas, error: eCat } = await supabaseAdmin
    .from('categorias').insert(CATEGORIAS).select('id, nombre');
  if (eCat) throw new Error('categorias: ' + eCat.message);
  console.log(`   ✅ ${catsCreadas.length} categorías creadas`);

  // ── 4. Evento ─────────────────────────────────────────────────────────────
  console.log('\n4️⃣  Creando evento de prueba...');
  const { data: evento, error: eEv } = await supabaseAdmin
    .from('eventos').insert({
      nombre: NOMBRE_EVENTO,
      lugar: 'Auditorio Nacional FDFF (Prueba)',
      fecha_inicio: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      estado: 'inscripcion',
      costo_primera_cat: 1500,
      costo_adicional: 800,
      costo_oferta_primera: 1200,
      costo_oferta_adicional: 600,
      fecha_limite_oferta: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    }).select('id').single();
  if (eEv) throw new Error('evento: ' + eEv.message);
  const eventoId = evento.id;
  console.log(`   ✅ Evento creado: ${eventoId}`);

  // ── 5. eventos_categorias ─────────────────────────────────────────────────
  console.log('\n5️⃣  Vinculando categorías al evento...');
  const ecPayload = catsCreadas.map((cat, idx) => ({
    evento_id: eventoId,
    categoria_id: cat.id,
    orden_secuencia_categoria: idx + 1,
    estatus_logistica: 'abierta activa',
  }));
  const { data: evCats, error: eEC } = await supabaseAdmin
    .from('eventos_categorias').insert(ecPayload).select('id, categoria_id');
  if (eEC) throw new Error('eventos_categorias: ' + eEC.message);
  console.log(`   ✅ ${evCats.length} categorías vinculadas`);

  // Mapa categoría_id → evento_cat_id
  const catIdToEvCatId = {};
  evCats.forEach((ec, idx) => { catIdToEvCatId[ec.categoria_id] = ec.id; });

  // ── 6. Competidores (pesaje asistido simulado) ────────────────────────────
  console.log('\n6️⃣  Inscribiendo atletas y aprobando pesaje...');
  const competidoresPayload = [];

  for (let catIdx = 0; catIdx < catsCreadas.length; catIdx++) {
    const catId = catsCreadas[catIdx].id;
    const evCatId = catIdToEvCatId[catId];
    const atletasEnCat = INSCRIPCIONES_POR_CAT[catIdx];

    for (let i = 0; i < atletasEnCat.length; i++) {
      const atletaIdx = atletasEnCat[i];
      const atleta = atletasCreados[atletaIdx];
      competidoresPayload.push({
        atleta_id: atleta.id,
        evento_cat_id: evCatId,
        id_evento: eventoId,
        estatus_pesaje: 'aprobado',
        salida: 0,
        monto_total: i === 0 ? 1200 : 600,  // Early Bird: primera cat + adic
        uso_oferta: true,
      });
    }
  }

  const { data: comps, error: eComp } = await supabaseAdmin
    .from('competidores').insert(competidoresPayload).select('id, atleta_id, evento_cat_id');
  if (eComp) throw new Error('competidores: ' + eComp.message);
  console.log(`   ✅ ${comps.length} competidores inscritos con pesaje aprobado`);

  // ── 7. Asignación de dorsales (simula oficializarPreparacion) ─────────────
  console.log('\n7️⃣  Asignando dorsales correlativos...');
  let dorsal = 1;
  for (const evCat of evCats) {
    // Obtener competidores de esta categoría en orden de created_at
    const { data: compsDeEsta } = await supabaseAdmin
      .from('competidores').select('id')
      .eq('evento_cat_id', evCat.id).eq('id_evento', eventoId)
      .order('created_at', { ascending: true });

    for (const c of compsDeEsta || []) {
      await supabaseAdmin.from('competidores')
        .update({ numero_atleta: dorsal }).eq('id', c.id);
      dorsal++;
    }
  }
  console.log(`   ✅ Dorsales asignados del 1 al ${dorsal - 1}`);

  // ── 8. Cambiar estado del evento ──────────────────────────────────────────
  console.log('\n8️⃣  Cambiando estado del evento a "en_progreso"...');
  await supabaseAdmin.from('eventos')
    .update({ estado: 'en_progreso' }).eq('id', eventoId);
  console.log('   ✅ Evento en_progreso');

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('✅  SEED COMPLETADO');
  console.log('═'.repeat(60));
  console.log(`\n   Evento ID : ${eventoId}`);
  console.log(`   Categorías: ${catsCreadas.length}  |  Atletas: ${atletasCreados.length}  |  Dorsales: 1–${dorsal - 1}`);
  console.log('\n   Próximo paso:');
  console.log('   → node seeds/testVotos.js   (crea jueces y simula votación completa)');
  console.log('   → O prueba manualmente en: /estadisticas/mesa-computo/<eventoCatId>\n');

  // Guardar IDs en archivo temporal para que testVotos.js los use
  const fs = require('fs');
  const estado = {
    eventoId,
    evCatIds: evCats.map(ec => ec.id),
    atletaIdsPorCat: INSCRIPCIONES_POR_CAT.map(idxArr =>
      idxArr.map(i => atletasCreados[i].id)
    ),
  };
  fs.writeFileSync(
    require('path').join(__dirname, '.test-state.json'),
    JSON.stringify(estado, null, 2)
  );
  console.log('   Estado guardado en seeds/.test-state.json para testVotos.js\n');
}

main().catch(err => {
  console.error('\n❌ Error en seed:', err.message);
  process.exit(1);
});
