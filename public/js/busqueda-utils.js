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
    // Llamar DESPUES de inicializar la tabla con $(selector).DataTable(...).
    function aplicarBusquedaAcentoInsensibleFDFF(tableSelector) {
        var table = $(tableSelector).DataTable();
        var nTable = table.table().node();
        var $input = $('div.dataTables_filter input', table.table().container());

        // table.search('').draw() sincroniza el VALOR VISIBLE del input a ''
        // (comportamiento propio de DataTables) — si leyeramos $input.val() en
        // el ext.search.push ya estaria vacio para entonces. Por eso se captura
        // el termino ANTES de limpiar, en esta variable, y el filtro lee de ahi.
        var terminoActual = '';

        $.fn.dataTable.ext.search.push(function (settings, dataFila) {
            if (settings.nTable !== nTable) return true;
            var val = normalizarBusquedaFDFF(terminoActual);
            if (!val) return true;
            return dataFila.some(function (col) { return normalizarBusquedaFDFF(col).indexOf(val) !== -1; });
        });

        $input.off('keyup.DT search.DT input.DT paste.DT cut.DT');
        $input.on('keyup.fdff input.fdff', function () {
            terminoActual = this.value;
            table.search('').draw();
        });
    }

    // Misma idea que arriba pero para un set de inputs de filtro POR COLUMNA
    // (ej. una fila/pie de tabla con un <input> por columna). columnInputsFn
    // debe devolver, para un indice de columna dado, el elemento <input> (o
    // null) que filtra esa columna.
    function aplicarBusquedaPorColumnaAcentoInsensibleFDFF(tableSelector, columnInputsFn) {
        var table = $(tableSelector).DataTable();
        var nTable = table.table().node();

        $.fn.dataTable.ext.search.push(function (settings, dataFila) {
            if (settings.nTable !== nTable) return true;
            var ok = true;
            table.columns().every(function () {
                var idx = this.index();
                var input = columnInputsFn(idx);
                var val = input ? normalizarBusquedaFDFF(input.value) : '';
                if (val && normalizarBusquedaFDFF(dataFila[idx]).indexOf(val) === -1) ok = false;
            });
            return ok;
        });
    }

    window.normalizarBusquedaFDFF = normalizarBusquedaFDFF;
    window.filtrarFilasFDFF = filtrarFilasFDFF;
    window.aplicarBusquedaAcentoInsensibleFDFF = aplicarBusquedaAcentoInsensibleFDFF;
    window.aplicarBusquedaPorColumnaAcentoInsensibleFDFF = aplicarBusquedaPorColumnaAcentoInsensibleFDFF;
})();
