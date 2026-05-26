/**
 * Algoritmo oficial de Cómputo FDFF / IFBB
 * Centraliza la lógica de eliminación de extremos y desempates.
 */
const CompuAlgo = {
    calcular: function(votosAtleta) {
        // 1. Clonar para no mutar el original
        let votosOriginales = [...votosAtleta];
        let votosLimpios = [...votosAtleta];

        // 2. Aplicar regla de eliminación (solo si hay 5 o más jueces)
        if (votosLimpios.length >= 5) {
            votosLimpios.sort((a, b) => a - b);
            votosLimpios.pop(); // Elimina el valor más alto (peor posición)
            votosLimpios.shift(); // Elimina el valor más bajo (mejor posición)
        }

        const subtotal = votosOriginales.reduce((a, b) => a + b, 0);
        const puntajeLimpio = votosLimpios.reduce((a, b) => a + b, 0);

        return {
            subtotal,
            puntajeLimpio,
            votosOriginales
        };
    },

    ordenarResultados: function(listaParaRanking) {
        /**
         * Criterios de ordenación:
         * 1. Menor puntaje limpio.
         * 2. Desempate técnico (Relative Placement): El que tenga más votos de 1er lugar.
         */
        return listaParaRanking.sort((a, b) => {
            if (a.puntos !== b.puntos) {
                return a.puntos - b.puntos;
            }
            
            // Desempate por votos preferenciales (contar unos, luego doses, etc)
            for (let i = 1; i <= 15; i++) {
                const countA = a.votosOriginales.filter(v => v === i).length;
                const countB = b.votosOriginales.filter(v => v === i).length;
                if (countA !== countB) return countB - countA;
            }
            return 0;
        }).map((item, index) => ({
            ...item,
            lugar: index + 1
        }));
    }
};

// Exportar si estamos en un entorno CommonJS (opcional para compatibilidad)
if (typeof module !== 'undefined') {
    module.exports = CompuAlgo;
}