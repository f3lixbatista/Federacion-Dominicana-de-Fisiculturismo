const { supabaseAdmin } = require('../config/supabase');

// ── CATÁLOGO BASE ─────────────────────────────────────────────────────────────

const DIVISIONES = [
    // Sin parámetro
    { nombre: 'Open',               parametro: 'ninguno' },
    // Por peso (Bodybuilding)
    { nombre: 'Bantamweight',       parametro: 'peso' },
    { nombre: 'Lightweight',        parametro: 'peso' },
    { nombre: 'Welterweight',       parametro: 'peso' },
    { nombre: 'Light-Middleweight', parametro: 'peso' },
    { nombre: 'Middleweight',       parametro: 'peso' },
    { nombre: 'Super-Middleweight', parametro: 'peso' },
    { nombre: 'Light-Heavyweight',  parametro: 'peso' },
    { nombre: 'Heavyweight',        parametro: 'peso' },
    { nombre: 'Super-Heavyweight',  parametro: 'peso' },
    // Por estatura (Clase)
    { nombre: 'Class A',  parametro: 'estatura' },
    { nombre: 'Class B',  parametro: 'estatura' },
    { nombre: 'Class C',  parametro: 'estatura' },
    { nombre: 'Class D',  parametro: 'estatura' },
    { nombre: 'Class E',  parametro: 'estatura' },
    { nombre: 'Class F',  parametro: 'estatura' },
    { nombre: 'Class G',  parametro: 'estatura' },
    { nombre: 'Class H',  parametro: 'estatura' },
    { nombre: 'Class I',  parametro: 'estatura' },
    { nombre: 'Class J',  parametro: 'estatura' },
    { nombre: 'Class K',  parametro: 'estatura' },
];

const DISCIPLINAS = [
    // ── MASCULINO ─────────────────────────────────────────────────────────────
    { nombre: "Men's Bodybuilding",       sexo: 'M',
      divs: ['Open','Bantamweight','Lightweight','Welterweight','Light-Middleweight',
             'Middleweight','Super-Middleweight','Light-Heavyweight','Heavyweight','Super-Heavyweight'] },

    { nombre: "Men's Classic Bodybuilding", sexo: 'M',
      divs: ['Open','Class A','Class B','Class C','Class D','Class E','Class F'] },

    { nombre: "Men's Games Classic",      sexo: 'M',
      divs: ['Open','Class A','Class B','Class C'] },

    { nombre: "Men's Classic Physique",   sexo: 'M',
      divs: ['Open','Class A','Class B','Class C','Class D','Class E','Class F'] },

    { nombre: "Men's Fitness",            sexo: 'M',
      divs: ['Open','Class A'] },

    { nombre: "Men's Physique",           sexo: 'M',
      divs: ['Open','Class A','Class B','Class C','Class D','Class E','Class F','Class G'] },

    { nombre: "Men's Fit Model",          sexo: 'M',
      divs: ['Open','Class A','Class B','Class C','Class D'] },

    { nombre: "Muscular Men's Physique",  sexo: 'M',
      divs: ['Open','Class A','Class B','Class C','Class D'] },

    { nombre: 'Male Children Fitness',    sexo: 'M',
      divs: ['Open','Class A','Class B','Class C','Class D','Class E','Class F'] },

    // ── FEMENINO ──────────────────────────────────────────────────────────────
    { nombre: "Women's Wellness",         sexo: 'F',
      divs: ['Open','Class A','Class B','Class C','Class D','Class E'] },

    { nombre: "Women's Fit Model",        sexo: 'F',
      divs: ['Open','Class A','Class B','Class C','Class D'] },

    { nombre: "Women's Bikini",           sexo: 'F',
      divs: ['Open','Class A','Class B','Class C','Class D','Class E','Class F','Class G','Class H','Class I'] },

    { nombre: "Women's Artistic Fitness", sexo: 'F',
      divs: ['Open','Class A','Class B','Class C','Class D','Class E','Class F'] },

    { nombre: "Women's Acrobatic Fitness",sexo: 'F',
      divs: ['Open','Class A','Class B','Class C'] },

    { nombre: "Women's Bodyfitness",      sexo: 'F',
      divs: ['Open','Class A','Class B','Class C','Class D','Class E'] },

    { nombre: "Women's Physique",         sexo: 'F',
      divs: ['Open','Class A','Class B','Class C'] },

    { nombre: 'Female Children Fitness',  sexo: 'F',
      divs: ['Open','Class A','Class B','Class C','Class D','Class E','Class F','Class G','Class H','Class I','Class J','Class K'] },

    // ── MIXTO ─────────────────────────────────────────────────────────────────
    { nombre: 'Mixed Pairs', sexo: 'F-M', divs: ['Open'] },
    { nombre: 'Fit Pairs',   sexo: 'F-M', divs: ['Open'] },
];

// ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────────

async function seedCatalogoCategorias() {
    try {
        // Verificar si las tablas existen y están vacías
        const { data: existing, error: checkErr } = await supabaseAdmin
            .from('disciplinas').select('id').limit(1);

        if (checkErr) {
            // La tabla no existe aún (SQL pendiente de ejecutar)
            console.warn('⚠️  Seed catálogo: tabla "disciplinas" no existe todavía. Ejecuta el SQL primero.');
            return;
        }

        if (existing && existing.length > 0) {
            console.log('ℹ️  Seed catálogo: disciplinas ya cargadas, se omite el seed.');
            return;
        }

        console.log('🌱 Ejecutando seed de catálogo (disciplinas/divisiones)…');

        // 1. Insertar todas las divisiones
        const { data: divsInsertadas, error: errDivs } = await supabaseAdmin
            .from('divisiones')
            .insert(DIVISIONES)
            .select('id, nombre');
        if (errDivs) throw new Error('divisiones: ' + errDivs.message);

        // Mapa nombre → id para lookup rápido
        const divMap = {};
        divsInsertadas.forEach(d => { divMap[d.nombre] = d.id; });

        // 2. Insertar disciplinas y vincular divisiones
        for (const disc of DISCIPLINAS) {
            const { data: discInsertada, error: errDisc } = await supabaseAdmin
                .from('disciplinas')
                .insert([{ nombre: disc.nombre, sexo: disc.sexo }])
                .select('id')
                .single();
            if (errDisc) throw new Error(`disciplina "${disc.nombre}": ` + errDisc.message);

            const links = disc.divs
                .filter(d => divMap[d])
                .map(d => ({ disciplina_id: discInsertada.id, division_id: divMap[d] }));

            if (links.length > 0) {
                const { error: errLink } = await supabaseAdmin
                    .from('disciplina_divisiones').insert(links);
                if (errLink) throw new Error(`links "${disc.nombre}": ` + errLink.message);
            }
        }

        console.log(`✅ Seed completo: ${DISCIPLINAS.length} disciplinas y ${DIVISIONES.length} divisiones cargadas.`);
    } catch (err) {
        console.error('❌ Error en seed catálogo:', err.message);
    }
}

module.exports = seedCatalogoCategorias;
