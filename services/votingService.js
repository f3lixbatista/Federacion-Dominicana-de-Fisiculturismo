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

    // Aplicamos el desempate técnico sugerido por la IFBB
    resultadosFinales.sort((a, b) => {
        if (a.puntos !== b.puntos) return a.puntos - b.puntos;
        
        // Comparación de boletas (Relative Placement)
        for (let i = 1; i <= 15; i++) {
            const countA = a.votosOriginales.filter(v => v === i).length;
            const countB = b.votosOriginales.filter(v => v === i).length;
            if (countA !== countB) return countB - countA;
        }
        return 0;
    });

    return resultadosFinales.map((resultado, index) => ({
        ...resultado,
        lugarSugerido: index + 1
    }));
};

module.exports = {
    calcularPosicionesFinales
};