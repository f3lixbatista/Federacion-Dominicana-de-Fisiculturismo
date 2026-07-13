/**
 * Implementación de la Regla IFBB: 
 * Se eliminan los valores extremos (más alto y más bajo) si hay 5 o más jueces.
 */
const calcularPosicionesFinales = (votosPorAtleta) => {
    const resultados = Object.entries(votosPorAtleta).map(([atleta_id, votos]) => {
        const votosOrdenados = [...votos].sort((a, b) => a - b);
        let votosLimpios = [...votosOrdenados];

        // Regla de extremos: solo si hay 5 o más jueces
        if (votosLimpios.length >= 5) {
            votosLimpios.shift(); // Elimina el más bajo (mejor posición)
            votosLimpios.pop();   // Elimina el más alto (peor posición)
        }

        const puntos = votosLimpios.reduce((sum, valor) => sum + valor, 0);
        return {
            atleta_id,
            votosOriginales: votos,
            votosLimpios,
            puntos
        };
    });

    // 1. Ordenar por puntos (menor es mejor)
    resultados.sort((a, b) => a.puntos - b.puntos);

    // 2. Detectar empates y aplicar Relative Placement (Sugerido)
    const resultadosFinales = resultados.map((atleta, index, array) => {
        const empate = array.filter(a => a.puntos === atleta.puntos).length > 1;
        return { ...atleta, empateDetectado: empate };
    });

    // Pre-calcular histograma una sola vez por atleta (evita .filter() dentro del comparador)
    resultadosFinales.forEach(r => {
        const hist = new Uint8Array(16);
        r.votosOriginales.forEach(v => { if (v >= 1 && v <= 15) hist[v]++; });
        r._hist = hist;
    });

    // Relative Placement con histogramas pre-calculados — O(n log n × 15) sin I/O
    resultadosFinales.sort((a, b) => {
        if (a.puntos !== b.puntos) return a.puntos - b.puntos;
        for (let i = 1; i <= 15; i++) {
            if (a._hist[i] !== b._hist[i]) return b._hist[i] - a._hist[i];
        }
        return 0;
    });

    return resultadosFinales.map((resultado, index) => ({
        ...resultado,
        lugarSugerido: index + 1
    }));
};

const calcularRankingEquipos = (participaciones) => {
    const puntosMap = { 1: 7, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };
    const teamsRankingRaw = {};

    (participaciones || []).forEach(p => {
        const teamName = p.atletas?.preparadores?.nombre_completo || 'Independientes';
        if (!teamsRankingRaw[teamName]) teamsRankingRaw[teamName] = 0;
        
        if (puntosMap[p.posicion_final]) {
            teamsRankingRaw[teamName] += puntosMap[p.posicion_final];
        }
        if (p.es_ganador_absoluto) {
            teamsRankingRaw[teamName] += 11;
        }
    });

    return Object.entries(teamsRankingRaw)
        .map(([nombre, puntos]) => ({ nombre, puntos }))
        .sort((a, b) => b.puntos - a.puntos);
};

module.exports = {
    calcularPosicionesFinales,
    calcularRankingEquipos
};