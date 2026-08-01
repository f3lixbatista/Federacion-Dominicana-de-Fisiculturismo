// Utilidades de búsqueda insensible a acentos, compartidas por todo el proyecto.
// Se carga globalmente desde cabecera.ejs, justo despues de datatables.min.js.
// No usar caracteres unicode literales como delimitadores/miembros de regex aqui
// — construir siempre via String.fromCharCode (ver hallazgo #14 en CLAUDE.md: un
// caracter especial mal pegado puede romper el parseo de TODO el script que lo
// contiene).
(function () {
    var RE_DIACRITICOS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

    function normalizarBusquedaFDFF(s) {
        return (s == null ? '' : s.toString()).toLowerCase().normalize('NFD').replace(RE_DIACRITICOS, '');
    }

    // Retrasa la ejecucion de fn hasta que pasen ms milisegundos sin nuevas
    // llamadas — evita recalcular el filtro en CADA tecla presionada.
    function debounceFDFF(fn, ms) {
        var t = null;
        return function () {
            var args = arguments, ctx = this;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, ms);
        };
    }

    // Filtro manual (no-DataTables): oculta filas de un contenedor cuyo texto
    // no incluya el termino buscado, ignorando acentos en ambos lados.
    function filtrarFilasFDFF(inputEl, filaSelector) {
        var val = normalizarBusquedaFDFF(inputEl.value);
        document.querySelectorAll(filaSelector).forEach(function (fila) {
            fila.style.display = normalizarBusquedaFDFF(fila.innerText || fila.textContent).indexOf(val) !== -1 ? '' : 'none';
        });
    }

    // Hace que el buscador NATIVO de una DataTable ("Search:") ignore acentos.
    // IMPORTANTE: DataTables aplica su propio filtro (sensible a acentos) sobre
    // oInput.sSearch ANTES de correr los ext.search.push — si le pasaramos el
    // termino tal cual a table.search(), esa primera pasada ya descartaria las
    // filas con acento antes de que nuestro filtro personalizado pudiera
    // rescatarlas. Por eso NUNCA se le pasa el valor real a table.search(): se
    // mantiene vacio (coincide con todo) y el filtro real lo hace el
    // ext.search.push leyendo el input directamente.
    //
    // Rendimiento: normalizar (NFD) cada columna de cada fila en CADA tecla es
    // caro con miles de filas — se cachea el texto normalizado por fila (la
    // data no cambia entre teclas, solo el termino buscado) y se debounce el
    // input 150ms para no recalcular en cada pulsacion mientras se escribe rapido.
    //
    // Llamar DESPUES de inicializar la tabla con $(selector).DataTable(...).
    function aplicarBusquedaAcentoInsensibleFDFF(tableSelector) {
        var table = $(tableSelector).DataTable();
        var nTable = table.table().node();
        var $input = $('div.dataTables_filter input', table.table().container());
        var terminoActual = '';
        var cacheFila = {};

        $.fn.dataTable.ext.search.push(function (settings, dataFila, rowIdx) {
            if (settings.nTable !== nTable) return true;
            var val = normalizarBusquedaFDFF(terminoActual);
            if (!val) return true;
            var normalizado = cacheFila[rowIdx];
            if (normalizado === undefined) {
                normalizado = normalizarBusquedaFDFF(dataFila.join(' '));
                cacheFila[rowIdx] = normalizado;
            }
            return normalizado.indexOf(val) !== -1;
        });

        $input.off('keyup.DT search.DT input.DT paste.DT cut.DT');
        $input.on('keyup.fdff input.fdff', debounceFDFF(function () {
            terminoActual = this.value;
            table.search('').draw();
        }, 150));
    }

    // Misma idea que arriba pero para un set de inputs de filtro POR COLUMNA
    // (ej. una fila/pie de tabla con un <input> por columna). columnInputsFn
    // debe devolver, para un indice de columna dado, el elemento <input> (o
    // null) que filtra esa columna. Tambien cacheado por (fila, columna).
    function aplicarBusquedaPorColumnaAcentoInsensibleFDFF(tableSelector, columnInputsFn) {
        var table = $(tableSelector).DataTable();
        var nTable = table.table().node();
        var cacheCelda = {};
        var numCols = table.columns().count();
        // columnInputsFn hace una consulta al DOM (jQuery) — resolverla UNA
        // SOLA VEZ y guardar los elementos, no en cada fila/columna de cada
        // draw(): eso multiplicaba por miles la cantidad de consultas al DOM
        // (1977 filas x 28 columnas = ~55,000 por tecla) y era la causa real
        // de la lentitud reportada por el usuario, no la normalizacion en si.
        var inputsCache = null;
        function getInputs() {
            if (!inputsCache) {
                inputsCache = [];
                for (var i = 0; i < numCols; i++) inputsCache[i] = columnInputsFn(i);
            }
            return inputsCache;
        }

        $.fn.dataTable.ext.search.push(function (settings, dataFila, rowIdx) {
            if (settings.nTable !== nTable) return true;
            var inputs = getInputs();
            var ok = true;
            for (var idx = 0; idx < inputs.length; idx++) {
                var input = inputs[idx];
                var val = input ? normalizarBusquedaFDFF(input.value) : '';
                if (!val) continue;
                var key = rowIdx + '_' + idx;
                var normalizado = cacheCelda[key];
                if (normalizado === undefined) {
                    normalizado = normalizarBusquedaFDFF(dataFila[idx]);
                    cacheCelda[key] = normalizado;
                }
                if (normalizado.indexOf(val) === -1) { ok = false; break; }
            }
            return ok;
        });
    }

    window.normalizarBusquedaFDFF = normalizarBusquedaFDFF;
    window.debounceFDFF = debounceFDFF;
    window.filtrarFilasFDFF = filtrarFilasFDFF;
    window.aplicarBusquedaAcentoInsensibleFDFF = aplicarBusquedaAcentoInsensibleFDFF;
    window.aplicarBusquedaPorColumnaAcentoInsensibleFDFF = aplicarBusquedaPorColumnaAcentoInsensibleFDFF;
})();
