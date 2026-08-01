# FDFF — Sistema de Gestión Federativo (FDFF Live)

## Descripción del proyecto
Plataforma web integral para digitalizar el ciclo completo de una competencia de fisiculturismo y fitness IFBB/FDFF. Cubre: registro y afiliación de atletas, pesaje técnico, dorsaleo automático, votación de jueces en tiempo real (Mesa de Cómputo con algoritmo IFBB), monitor del MC, backstage, DJ Virtual (playlist por dorsal), muro social, salón de la fama y recaudación.

El administrador del proyecto es Félix Batista (admin principal).

---

## Stack técnico
- **Backend:** Node.js + Express (MPA — cada navegación recarga página completa)
- **Vistas:** EJS
- **Base de datos:** Supabase (PostgreSQL)
  - `supabase` — cliente anon (respeta RLS, para operaciones del cliente)
  - `supabaseAdmin` — service-role (bypassa RLS, solo en backend/controllers)
- **CSS:** Bootstrap 5.2
- **Auth:** sesiones con cookies HttpOnly + roles definidos en BD

---

## Roles del sistema
| Rol | Acceso |
|---|---|
| `admin` | Todo |
| `ejecutivo` | Gestión de eventos, categorías, atletas |
| `juez` | Panel de votación |
| `estadistico` | Mesa de cómputo, absolutos |
| `atleta` | Perfil, inscripción web |
| `preparador` | Panel de coach/team |
| `fotografo` | Subida de fotos |
| `general` | Solo puede afiliarse |

---

## Estructura de archivos actual
```
app.js                        — Servidor Express, middlewares, monta rutas
config/supabase.js            — Exporta { supabase, supabaseAdmin }
middlewares/auth.js           — checkRole([...roles]) middleware
services/authService.js       — Validación JWT, normalización de perfiles
services/votingService.js     — Algoritmo IFBB (elimina extremos, Relative Placement)

controllers/
  atletasController.js        — CRUD atletas, perfil social, galería
  eventosController.js        — Ciclo de vida del evento, dorsaleo, monitor MC
  estadisticasController.js   — Votaciones, cómputo, absolutos, recaudación
  inscripcionController.js    — Pesaje asistido, inscripción admin, ficha atleta
  preparadoresController.js   — Afiliación y habilitación de coaches
  adminController.js          — Staff, reportes, auditoría

router/
  Atletas.js
  Categoria.js                — Categorías, disciplinas, divisiones, crear evento
  Eventos.js                  — Centro de mando, preparación, backstage, MC
  Inscripcion.js              — Pesaje asistido, inscripción atleta
  Estadisticas.js             — Mesa de cómputo, absolutos
  Preparadores.js
  Social.js                   — Muro, noticias
  Admin.js
  rutasBat.js                 — Rutas generales (index, login, logout, afiliación)
  DJ.js                       — Audio del atleta

views/
  template/
    cabecera.ejs              — Layout: topbar + sidebar colapsable + abre #main-content
    navbar.ejs                — Contenido del sidebar (links por rol)
    footer.ejs                — Cierra #main-content, scripts globales
    espera.ejs                — Pantalla de espera (modo kiosko)
  eventos/
    competencias.ejs          — Galería pública de eventos
    dashboard.ejs             — Panel central del evento (admin)
    inscripcion.ejs           — Pesaje + inscripción asistida (admin/ejecutivo)
    InscripcionAtleta.ejs     — Inscripción web (atleta)
    centro_mando.ejs          — Centro de mando del evento
    monitor_mc.ejs            — Monitor del maestro de ceremonias (solo lectura)
  estadisticas/
    nueva_mesa_computo.ejs    — Matriz de votación jueces
    gestion_absolutos.ejs     — Duelo de campeones y puntos team
    computo.ejs
  atleta_vistas/
    perfil.ejs                — Carnet digital, historial, galería
    cabecera.ejs
  social/
    muro.ejs
    perfil.ejs
  vistas_auth/login.ejs
  afiliacion.ejs              — Registro atleta con descargo
  afiliacionPreparador.ejs
  crearCategoria.ejs          — Crear disciplinas, divisiones, categorías
  categorias.ejs              — Listado de categorías
  nuevoEvento.ejs             — Crear evento con categorías
  crear.ejs / detalle.ejs / atletas.ejs

public/
  js/kiosko-logic.js          — Lógica modo kiosko
  css/
  img/
```

---

## Layout (sidebar)
`cabecera.ejs` genera todo el layout global:
1. **Topbar fijo** (`#topbar`, `z-index:1050`): hamburger toggle, brand FDFF, chip usuario (nombre + badge de rol + botón Kiosko + Salir)
2. **Sidebar** (`<aside id="sidebar">`, `z-index:1040`): contiene `navbar.ejs`, colapsable en desktop, deslizable en móvil
3. **`<div id="main-content">`**: abierto en `cabecera.ejs`, cerrado en `footer.ejs`

### Variables CSS
```css
--sb-width: 240px;
--sb-collapsed-width: 64px;
--topbar-h: 52px;
```

### Comportamiento
- Desktop: `body.sb-collapsed` → sidebar a 64px; estado en `localStorage('sb-collapsed')`
- Móvil (≤991px): `body.sb-open` → sidebar visible con overlay; por defecto oculto (`width:0`)
- **NUNCA** usar `display:flex` en `#sidebar` — rompe el `overflow-y:auto`

### Colores de roles (badge)
`admin→danger` | `ejecutivo→warning` | `juez→info` | `estadistico→primary` | `atleta→success` | `preparador/general→secondary`

---

## Convenciones críticas de código
1. **Visibilidad JS/CSS:** NO usar `class="d-none"` en elementos que JS necesita mostrar. Bootstrap `.d-none { display:none !important }` gana sobre `el.style.display`. Usar `style="display:none"` en HTML y `el.style.display = 'block'` en JS.
2. **`supabaseAdmin`** solo en controllers del servidor. Nunca exponer en el cliente.
3. **En controllers, usar SIEMPRE `supabaseAdmin`, nunca el `supabase` (anon) crudo** — salvo que exista una razón explícita para respetar RLS. El cliente `supabase` del servidor **no reenvía el JWT del usuario** (se crea una sola vez con la anon key a nivel de módulo), así que cualquier política RLS que dependa de `auth.uid()` NUNCA se cumple desde un controller, aunque el usuario esté perfectamente autenticado a nivel de Express/cookies. Esto rompió silenciosamente `verBoletaJuez` hasta 2026-07-31 (el juez nunca encontraba su silla). Ver §"Hallazgos críticos" abajo.
4. **Respuestas del asistente:** siempre en **español**.
5. **Apostrofes en datos de BD:** pueden ser curvos (`'` U+2019) o rectos (`'` U+0027). Siempre normalizar antes de comparar strings con nombres de disciplinas.
6. **Orden de carga de Bootstrap 5 en `cabecera.ejs`:** el `<script>` de `bootstrap@5.2.2/dist/js/bootstrap.bundle.min.js` debe ir **al final** de los `<script>` de cabecera, después de DataTables. El bundle de DataTables `bs4-4.1.1` trae embebida su propia copia de Bootstrap 4 y sobreescribe `window.bootstrap` si carga después — cualquier `new bootstrap.Modal(...)`/`bootstrap.Dropdown`/etc. en CUALQUIER página quedaría usando la API de Bootstrap 4 en silencio (sin error visible) si se invierte el orden.
7. **Inicialización de componentes Bootstrap (modales, etc.) en vistas:** no depender solo de `document.addEventListener('DOMContentLoaded', ...)` en scripts que se cargan al final del body — verificar `document.readyState` y ejecutar de inmediato si ya pasó `'loading'`. Ver `views/eventos/inscripcion.ejs`.
8. **NUNCA usar comillas tipográficas/curvas (`'` `'` U+2018/U+2019, `"` `"` U+201C/U+201D) como delimitadores de string/selector dentro de un `<script>`** — son inválidas como sintaxis JS y rompen el parseo de **todo** el bloque `<script>` que las contiene, no solo la línea donde aparecen (ver hallazgo #14, 2026-07-31). Si el editor/autocorrector las insertó al copiar texto, reemplazar por rectas (`'`, `"`) antes de guardar. Esto es distinto de la regla #5 (apóstrofes curvos en **datos** de BD, que sí hay que tolerar y normalizar al comparar strings).
9. **`.limit(N)` NO es suficiente para "traer todos los registros" de una tabla grande** — PostgREST tiene su propio tope máximo de filas por respuesta (típicamente 1000) que aplica sin importar qué `.limit()` pida el cliente. `listarAtletas` tenía además un `.limit(500)` fijo que dejaba fuera a más de la mitad de los ~1977 atletas reales (corregido 2026-07-31 con paginación real vía `.range()` en loop hasta agotar resultados). Si una tabla puede crecer sin límite claro, paginar con `.range()`, no confiar en subir el número una vez y olvidarlo.
10. **Todo buscador nuevo debe usar `normalizarBusquedaFDFF()` de `public/js/busqueda-utils.js`** (cargado globalmente desde `cabecera.ejs`, disponible en cualquier vista sin `<script src>` adicional) — nunca comparar con `.toLowerCase().includes()` a secas, eso es sensible a acentos ("jose" no encuentra "José"). Auditoría completa 2026-07-31 encontró y corrigió el mismo bug en 13+ buscadores del proyecto. Para el buscador **nativo** de una DataTable ("Search:") o filtros por columna, usar `aplicarBusquedaAcentoInsensibleFDFF(selector)` / `aplicarBusquedaPorColumnaAcentoInsensibleFDFF(selector, fn)` — **nunca** pasar el término tal cual a `table.search()`/`col.search()`: DataTables aplica su propio filtro sensible a acentos ANTES de que corran los `ext.search.push` personalizados, así que esas funciones dejan el buscador nativo en blanco (coincide con todo) y hacen el filtro real ellas mismas leyendo el input. Si la tabla usa `language: {url: ...}` (carga asíncrona del idioma), la llamada va **dentro** de `initComplete`, nunca después del `.DataTable({...})` — si no, corre antes de que el buscador exista en el DOM. **Nunca hacer una consulta al DOM (`document.querySelector`/jQuery) dentro de una función `ext.search.push`** — esa función corre UNA VEZ POR FILA en cada `.draw()` (con 1977 filas × 28 columnas, ~55,000 consultas por tecla) y fue la causa real de una lentitud de ~2.2s por búsqueda en `/atletas` (2026-08-01) — no la normalización de acentos en sí. Resolver cualquier elemento del DOM necesario UNA sola vez (cacheado fuera del callback) y solo leer `.value`/propiedades dentro del callback; `aplicarBusquedaAcentoInsensibleFDFF`/`aplicarBusquedaPorColumnaAcentoInsensibleFDFF` ya cachean tanto el texto normalizado por fila como los elementos `<input>`, y el input del usuario se debounce 150ms (`debounceFDFF`).
11. **Nunca usar `type="number"` en un `<input>` para un campo que puede contener texto no puramente numérico** (guiones, prefijos, ceros a la izquierda) — un `<input type="number">` con un valor no numérico se vacía EN SILENCIO en el navegador (sin error visible), aunque el `value="..."` esté bien puesto en el HTML. Encontrado 2026-08-01 en `detalle.ejs`: `idfdff` (formato `"FDFF-1527"`), `cedula` (a veces con guiones tipo `"001-0019376-9"`) y `postal` (puede llevar ceros a la izquierda) estaban en `type="number"`, así que esos campos aparecían vacíos en el formulario de edición aunque el dato existiera en la BD — corregidos a `type="text"` (con `inputmode="numeric"` donde aplica, para teclado numérico en móvil sin perder el formato).
12. **Nunca llamar `window.location.reload()` (o cualquier navegación de la ventana actual) inmediatamente después de `window.open(...)` en el mismo tick** — es una carrera de navegación conocida en Chrome/Edge: recargar la ventana de origen puede interrumpir la carga de la ventana emergente recién abierta y dejarla con contenido a medias/vacío, de forma intermitente (no siempre falla, lo que la hace difícil de reproducir navegando manualmente a la URL del popup por separado). Encontrado 2026-08-01 en `inscripcion.ejs` (`guardarInscripcionOficial`): tras guardar, se abría el descargo imprimible con `imprimirDescargoFisico()` (que hace `window.open`) y en la misma línea siguiente se llamaba `window.location.reload()` — el usuario reportó que el descargo imprimía sin categorías/correo/monto. Corregido retrasando el reload con `setTimeout(..., 600)` para darle tiempo al popup a completar su navegación antes de que la ventana de origen se recargue. Si se necesita abrir una ventana nueva y luego navegar/recargar la actual, siempre diferir la segunda acción.

---

## Tablas Supabase principales

### `atletas`
```
id (uuid), nombre, cedula, sexo (M|F), fecha_nacimiento, estatura (cm), peso (kg),
idfdff, estatus_afiliacion (pendiente|habilitado|suspendido), preparador_id, foto_url,
instagram, gimnasio, preparador, celular, telfijo, email_preparador, celular_preparador,
provincia, municipio, sector, calle, pais, postal, nacionalidad, pasaporte, ocupacion,
categoria, fecha_inscripcion, fecha_ultima_renovacion,
pesaje_evento_id (uuid, FK eventos), pesaje_fecha (timestamptz)
```
- Columna de fecha de nacimiento: **`fecha_nacimiento`** (no `nacimiento`)
- `pesaje_evento_id`/`pesaje_fecha` (migración `009_pesaje_evento_atletas.sql`, 2026-07-31): marcan para qué evento se confirmó por última vez `peso`/`estatura` — no es un pesaje histórico por evento, solo el ÚLTIMO. Usado por `eventos/pesaje.ejs` para bloquear "PESAR" (evitar duplicados) cuando `pesaje_evento_id` ya coincide con el evento actual.
- `afiliacion.ejs` usa `name="nacimiento"` en el form pero el JS lo mapea a `fecha_nacimiento` antes de enviar → correcto
- **`fecha_inscripcion` se eliminó de la BD en algún momento sin migración registrada** (mismo patrón que `monto_total`/`uso_oferta`, ver hallazgo #5 en "Auditoría completa") y se restauró el 2026-08-01 vía `migrations/010_restaurar_fecha_inscripcion_atletas.sql` + backfill (`fecha_inscripcion = created_at::date`) para los ~1977 atletas existentes. Mientras faltó, **`actualizarAtleta` (editar atleta) y `solicitarAfiliacion` (afiliación) fallaban con 500** en TODO intento de guardar, porque ambas hacen `{ ...req.body }` sin filtrar y `detalle.ejs`/`afiliacion.ejs` siempre incluyen ese campo — un UPDATE/upsert con una sola columna inexistente falla completo en Postgres (mismo patrón que hallazgo #12).
- **`actualizarAtleta`/`solicitarAfiliacion` ahora normalizan `''` → `null` antes de escribir a Supabase** — un `<input type="date">` (u otro campo numérico) vacío llega como cadena vacía `""` desde el form, y Postgres rechaza `""` para columnas `DATE`/numéricas (solo acepta `NULL` o un valor válido), lo que también rompía el guardado completo para cualquier atleta con datos incompletos (ej. sin `fecha_nacimiento`/`pasaporte` en archivo). Si se agrega un endpoint nuevo que haga spread de `req.body` directo a un `.update()`/`.upsert()`, aplicar la misma normalización.
- Usar siempre `atleta.fecha_nacimiento` en vistas y queries

### `categorias`
```
id, nombre, modalidad (Senior|Junior|Master|Children), disciplina (text),
sexo (M|F|F-M), division (text), edad_min, edad_max, peso_min, peso_max,
estatura_min, estatura_max
```
- `disciplina` es texto libre = nombre de la disciplina origen

### `disciplinas`
```
id, nombre, sexo (M|F|F-M), grupo_afinidad (TEXT)
```
- `grupo_afinidad` requiere migración: `ALTER TABLE disciplinas ADD COLUMN grupo_afinidad TEXT;`
- Valores: `culturismo_m | physique_m | muscular_m | bikini_f | wellness_f | bodyfitness_f | physique_f | children_m | children_f`

### `divisiones`
```
id, nombre, parametro (peso|estatura|ambos|ninguno)
```

### `disciplina_divisiones`
```
disciplina_id, division_id
```

### `eventos`
```
id, nombre, estado (inscripcion|pesaje|competencia|en_progreso|cerrado),
costo_primera_cat, costo_adicional, costo_oferta_primera, costo_oferta_adicional,
fecha_limite_oferta, fecha_inicio, lugar, cronograma_mc (jsonb), resultados_en_vivo (jsonb), ...
```
- `cronograma_mc` (jsonb): arreglo de bloques `{tipo, nombre, orden, evento_cat_id?}` con categorías activas + actividades intercaladas, en orden. Lo escribe `oficializarPreparacion` y lo consumen `monitor_mc.ejs` y `backstage.ejs` (sección "Programa Oficial"). Antes del 2026-07-30 esta columna existía pero nunca se poblaba — las vistas la esperaban vacía para siempre.

### `eventos_categorias`
```
id, evento_id, categoria_id
```

### `competidores`
```
id, atleta_id, evento_cat_id, id_evento, numero_atleta, salida,
peso_confirmado, estatura_confirmada, juez_id, estatus_pesaje (pendiente|aprobado),
es_ganador_absoluto, posicion_final, puntos_totales,
puntos_eliminatoria, puntos_semifinal, puntos_final_r1, puntos_final_r2 (sin uso real — ver abajo),
fase_actual, clasificado_fase (sin uso real — ver abajo),
musica_url, foto_atletica_url,
url_comprobante_pago, pago_validado, fecha_subida_pago, observaciones_pago, fecha_revision_pago,
monto_total, uso_oferta, created_at
```
- **`monto_total`/`uso_oferta` se eliminaron accidentalmente de la BD en algún momento sin migración registrada** (ninguna migración en `migrations/` los toca) y se restauraron el 2026-07-31 vía `migrations/008_restaurar_monto_total_competidores.sql`. Mientras faltaron, **`guardarInscripcionAsistida` (inscripción asistida real) fallaba en TODO intento de registrar un atleta** (`column competidores.monto_total does not exist`), y `_buildListado` (listados oficiales de atletas/posiciones) fallaba silenciosamente — el error no se verificaba al desestructurar la respuesta de Supabase, así que `listado-atletas`/`listado-posiciones` mostraban siempre 0 participantes sin ningún error visible. **Antes de asumir que un problema de datos es "normal", verificar que las columnas que el código espera realmente existen en la tabla** — este proyecto no tiene todas sus migraciones trackeadas.
- **`puntos_eliminatoria`/`puntos_semifinal`/`puntos_final_r1`/`puntos_final_r2`/`fase_actual`/`clasificado_fase`** existen en la tabla pero **no los escribe ningún código actual** — son vestigios de un diseño más granular (guardar puntos por fase, marcar quién clasifica) que nunca se terminó de implementar. Lo que sí se usa activamente es `puntos_totales` + `posicion_final`, escritos únicamente por `oficializarCategoria`/`oficializarAbsoluto` sobre la fase que esté activa en ese momento (se sobreescriben en cada fase, no se acumulan por separado salvo el caso manual de `final_r2` que suma el `R1` ya impreso en pantalla).

### `preparadores`
```
id, nombre_completo, gimnasio_labora, estatus_afiliacion (pendiente|habilitado), ...
```

### `paneles_jueces`
```
id, id_evento, numero_panel (integer), cantidad_jueces (integer), created_at
```
- Un evento puede tener varios paneles (numero_panel 1, 2, 3...). El **panel 1** es la mesa principal (la que genera el Presidente de Mesa).
- Se crea/gestiona desde dos lugares que escriben a la misma tabla — no son sistemas distintos, son dos puntos de entrada:
  - `views/eventos/dashboard.ejs` (modal "Configuración de Paneles de Jueces"): crea/edita **cualquier panel** (1, 2, 3...), pensado para logística general y jueces de relevo.
  - `views/eventos/preparacion.ejs` (tarjeta "Configuración de Panel de Jueces"): solo crea/edita el **panel 1**, con la regla del Presidente de Mesa aplicada automáticamente (ver abajo).

### `panel_sillas_jueces`
```
id, panel_id (FK → paneles_jueces.id), juez_id (FK → profiles.id), numero_silla (integer), es_presidente (boolean)
```
- **No tiene `id_evento` ni `panel_numero`** — para filtrar por evento hay que unir con `paneles_jueces` (`.select('..., paneles_jueces!inner(id_evento, numero_panel)')`). Antes de 2026-07-30 varias queries asumían columnas `id_evento`/`panel_numero` directas en esta tabla (no existen) y fallaban silenciosamente — ya corregido en `verCentroMando` y `guardarPanel()`.

### `programa_actividades`
```
id, evento_id, tipo (premiacion|receso|protocolo|apertura|otro), descripcion, orden_secuencia (integer)
```
- Actividades intercaladas entre categorías en el programa del evento (premiaciones, recesos, protocolo, apertura). Se define en `preparacion.ejs` junto con el orden de las categorías.

### `programa_invitados`
```
id, evento_id, categoria (juez_no_panel|staff|patrocinador|personalidad), nombre, detalle, orden
```
- Roster de invitados especiales a mencionar por el MC en la apertura. **Los jueces del panel principal NO se guardan aquí** — se leen en vivo desde `panel_sillas_jueces`/`paneles_jueces` al armar el guion o imprimir.

---

## Reglas de negocio FDFF

### Edades por modalidad
| Modalidad | Masculino | Femenino |
|---|---|---|
| Master | ≥ 40 años | ≥ 35 años |
| Junior | 16 – 23 años | 16 – 23 años |
| Children | < 16 años | < 16 años |
| Senior | Sin restricción | Sin restricción |

- Si `edad_min` en BD es `null` o `0`, se aplica la regla FDFF por defecto según `modalidad`
- La lógica vive en `renderizarCategorias()` dentro de `views/eventos/inscripcion.ejs`

### Reglas de afinidad (inscripción simultánea)

### Reglas globales
1. **Sexos nunca afines**: femeninas ≠ masculinas. Excepción: categorías Pairs (mixtas, un integrante de cada sexo).
2. **Modalidades no afines entre sí**: Junior + Master, Junior + Children y Master + Children nunca pueden coexistir en la misma inscripción.
3. **Senior es puerta abierta**: un atleta Junior o Master PUEDE además inscribirse en la versión Senior de cualquier disciplina de su grupo. Senior + Junior ✓ | Senior + Master ✓ (si el rango de edad aplica).
4. **Un solo Junior, un solo Master**: aunque el grupo tenga múltiples disciplinas con versión Junior/Master, solo se puede inscribir en UNA categoría Junior Y UNA Master a la vez.
5. **Children completamente aislado**: no es afín con ninguna otra modalidad ni grupo externo.
6. **Pairs son mixtos (F-M)**: cada atleta se inscribe individualmente. La validación de afinidad depende del sexo del atleta que se está inscribiendo.

### Grupos de disciplinas (crossover permitido)
Cada disciplina en el grupo puede tener versión Senior, Junior y Master propia.

| Grupo `grupo_afinidad` | Disciplinas | Pairs asociado |
|---|---|---|
| `culturismo_m` | Men's Bodybuilding, Men's Classic Bodybuilding, Men's Classic Physique, Men's Games Classic | Mixed Pairs (pareja esperada: Women's Physique) |
| `physique_m` | Men's Physique, Men's Physique Clásico, Men's Fit Model, Men's Fitness | Fit Pairs (pareja esperada: Women's Bikini) |
| `muscular_m` | Muscular Men's Physique | — sin afines |
| `bikini_f` | Women's Bikini, Women's Fit Model, Women's Artistic Fitness | Fit Pairs (pareja esperada: Men's Physique) |
| `wellness_f` | Women's Wellness, Women's Fit Model | — |
| `bodyfitness_f` | Women's Bodyfitness, Women's Acrobatic Fitness | — |
| `physique_f` | Women's Physique | Mixed Pairs (pareja esperada: Men's Bodybuilding) |
| `children_m` | Male Children Fitness | — |
| `children_f` | Female Children Fitness | — |

> **Women's Fit Model es puente parcial**: aparece en `bikini_f` y en `wellness_f`. No une ambos grupos — la primera categoría elegida determina el grupo activo. Bikini + Fit Model = el grupo es `bikini_f`, Women's Wellness queda bloqueada (y viceversa).

> **Fit Pairs / Mixed Pairs**: la categoría tiene `sexo = 'F-M'` y es visible para todos. Su grupo de afinidad depende del sexo del atleta: atleta masculino → pertenece a `physique_m`; atleta femenino → pertenece a `bikini_f`. Mixed Pairs: masculino → `culturismo_m`; femenino → `physique_f`.

> **"Men's Physique Clásico" ≠ "Men's Classic Physique"**: son DOS disciplinas distintas pese al nombre parecido (confundidas una vez en este proyecto, 2026-07-31 — ver hallazgo en `evento_fusionado_mr_republica` en memoria). "Men's Physique Clásico" es afín con Men's Physique (grupo `physique_m`) y usa la fórmula única peso_máx = estatura − 105. "Men's Classic Physique" es afín con Men's Bodybuilding/Classic Bodybuilding (grupo `culturismo_m`) y usa 7 clases con offset propio cada una — ver sección "Elegibilidad física" más abajo.

### Tabla de combinaciones de modalidad permitidas (dentro del mismo grupo)
| Combinación | ¿Permitida? |
|---|---|
| Senior A + Senior B (mismo grupo) | ✓ |
| Junior A + Senior A (misma disciplina) | ✓ |
| Junior A + Senior B (mismo grupo, disciplina distinta) | ✓ |
| Master A + Senior A | ✓ |
| Master A + Senior B (mismo grupo) | ✓ |
| Junior A + Junior B (aunque sean del mismo grupo) | ✗ solo una Junior a la vez |
| Master A + Master B | ✗ solo una Master a la vez |
| Junior + Master | ✗ |
| Cualquiera + Children | ✗ (Children aislado) |

### Regla de División
Dentro de la **misma disciplina y misma modalidad**, solo puede seleccionarse **una división**:
- `Junior Men's Bodybuilding – Bantamweight` bloquea `Junior Men's Bodybuilding – Welterweight` (misma disciplina, misma modalidad, distinta división) ✗
- `Junior Men's Bodybuilding – Bantamweight` + `Senior Men's Bodybuilding – Bantamweight` → válido (misma disciplina, distinta modalidad) ✓
- `Junior Men's Bodybuilding – Bantamweight` + `Senior Men's Bodybuilding – Welterweight` → válido (distinta modalidad, la división Senior es independiente) ✓
- Disciplinas distintas del mismo grupo son independientes: `Men's Bodybuilding – Bantamweight` + `Men's Classic Bodybuilding – Open` → válido ✓
- La clave interna es `normDisc|modalidad`, no solo `normDisc`.

### Agrupación visual al bloquear
Cuando se bloquean categorías, las disponibles se ordenan visualmente al inicio del listado (sin reordenar el DOM). Se usa la propiedad CSS `order` en el contenedor flex:
- Categorías disponibles o seleccionadas: `order: 0`
- Categorías bloqueadas: `order: 1`
- El contenedor `#listaCategoriasAfines` (Bootstrap `.list-group`) ya es `display:flex; flex-direction:column`
- En `InscripcionAtleta.ejs` se añadió el wrapper `<div id="lista-cats-web" style="display:flex;flex-direction:column;">`

### Estado de implementación en código
- `GRUPOS_AFINIDAD` + `validarAfinidad()` en `inscripcion.ejs` implementan: grupo de disciplina, regla Junior/Master, regla de división, agrupación visual. Normalización tolerante a apóstrofes curvos/rectos.
- `_GRUPOS_AFINIDAD_WEB` + `aplicarReglasAfinidad()` en `InscripcionAtleta.ejs` implementan las mismas reglas.
- Pairs (Fit Pairs / Mixed Pairs) son sex-aware — manejados por `_getPermitidas()` / `_getPermitidasW()` según `_sexoAtletaActual` / `_SEXO_ATLETA`.

### Algoritmo de puntuación IFBB
- Se eliminan el voto más alto y más bajo de cada atleta (solo si hay 5+ jueces)
- Se suman los votos restantes → menor puntaje = mejor posición
- Empates se resuelven por Relative Placement (histograma de votos originales, gana quien tenga más votos en las posiciones más altas)
- Implementado en `services/votingService.js` (`calcularPosicionesFinales`) — **triplicado** en el código: también existe en `public/js/compu-algo.js` (cliente, Mesa de Cómputo normal) y estaba reimplementado sin desempate en `views/estadisticas/nueva_mesa_computo.ejs` (Mesa de Cómputo de Absolutos) hasta que se le agregó el mismo desempate el 2026-07-31. Si se toca la regla de puntuación, **actualizar los 3 lugares**.

### Fases de competencia (`fase_competencia` / `fase`)
No es una columna persistente de `competidores` — vive como string libre en `votaciones_jueces.fase_competencia`, resuelto en cada pantalla vía query param `?fase=`. Valores válidos (los únicos que ofrece el selector de `computo.ejs`): `eliminatoria | semifinal | final_r1 | final_r2 | absoluto`.

**Auto-detección por cantidad de atletas** — única fuente de verdad: `votingService.resolverFaseAutomatica(total)`:
| Total de atletas | Fase automática |
|---|---|
| > 15 | `eliminatoria` |
| 7 – 15 | `semifinal` |
| ≤ 6 | `final_r1` |

Antes del 2026-07-31 esta lógica estaba duplicada e inconsistente en 4 lugares (`verMesaComputo`, `verPresidenteMesa`, `verComparacionJuez`, `verBoletaJuez`) — la boleta del juez usaba por defecto `'final'` (literal plano, ni siquiera una opción real del selector) sin mirar la cantidad de atletas, mientras la Mesa de Cómputo autodetectaba `'final_r1'` para las mismas 8 categorías. Resultado: el juez votaba en una fase, el estadístico miraba otra, y la matriz aparecía vacía sin ningún error. Ahora las 4 funciones llaman a `resolverFaseAutomatica()`.

**No existe "avance de fase" automático.** No hay ningún proceso que filtre atletas entre eliminatoria→semifinal→final — es 100% criterio humano: el estadístico simplemente cambia el `<select id="selectFase">` en `computo.ejs` y todos los atletas de la categoría vuelven a aparecer (sin filtrar a los "clasificados"). El corte de quién sigue queda en la cabeza del estadístico/presidente de mesa, no en el sistema. La pantalla "Presidente de Mesa" (`/estadisticas/presidente-mesa/:eventoCatId`) ayuda a marcar candidatos pero **no está enlazada desde ninguna vista** — hay que teclear la URL, o usar el atajo `/eventos/:id/presidente-mesa-actual` (agregado 2026-07-31) que autodetecta la categoría activa en tarima.

**`oficializarCategoria` exige fase `final_r1` o `final_r2`** (validado en servidor desde 2026-07-31) — antes se podía oficializar por error una ronda eliminatoria/semifinal como resultado definitivo, sin ninguna advertencia.

### Precios (Early Bird)
- Si la fecha actual ≤ `eventos.fecha_limite_oferta` → precios de oferta
- 1ra categoría paga `costo_primera_cat` (o `costo_oferta_primera`)
- Categorías adicionales pagan `costo_adicional` (o `costo_oferta_adicional`)

### Elegibilidad física por peso/estatura (bloqueo real, desde 2026-07-31)
El atleta debe caer estrictamente dentro del `peso_min`/`peso_max` y `estatura_min`/`estatura_max` de la categoría elegida — antes esto no se validaba en ningún lado (ni cliente ni servidor), era 100% criterio manual del staff para TODAS las disciplinas.
- **Reglas generales** (cualquier categoría con `peso_min`/`peso_max`/`estatura_min`/`estatura_max` definidos, sea cual sea su `parametro`): el valor `1000` en un `_max` es sentinela de "sin tope superior" (ej. Heavyweight `peso_max=1000`) y no bloquea.
- **4 disciplinas usan además una fórmula de relación talla-peso** (verificadas contra 4 tablas oficiales distintas, imágenes `mph clasico.jpeg`, `classic Physique senior.jpeg`, `fisiculturismo clasico senior.jpeg`, `games classic Bodybuilding senior.jpeg` — 2026-07-31), y **solo estas 4** (ninguna otra disciplina, ej. Muscular Men's Physique, usa este filtro):
  - **Men's Physique Clásico** (afín con Men's Physique/Junior/Master, grupo `physique_m`) — fórmula única sin bandas: `peso_máximo = estatura_cm − 105` (ej. 172cm→67kg, 204cm→99kg).
  - **Men's Classic Physique** (grupo `culturismo_m`) — la tabla oficial tiene 7 bandas de estatura (≤168cm … >196cm), cada una con SU PROPIO offset: 96, 94, 92, 89, 87, 85, 83.
  - **Men's Classic Bodybuilding** (grupo `culturismo_m`) — mismos 7 cortes de estatura que Classic Physique, offsets distintos: 100, 98, 96, 93, 91, 89, 87.
  - **Men's Games Classic** (grupo `culturismo_m`, catálogo listo pero sin vincular a ningún evento activo) — 9 bandas (≤162cm … >196cm), offsets: 102, 101, 100, 99, 98, 96, 95, 94, 93.
- ⚠️ **CORRECCIÓN 2026-08-01 — las bandas de la tabla NO son categorías/podios separados.** Se habían creado erróneamente 7 (o 9) filas de `categorias` por disciplina, una por banda (`division = "Class A"`, `"Class B"`, ...), como si cada banda fuera un podio propio — esto infló el evento "Mr. República" con categorías que **no existen en el afiche real** (el usuario lo señaló: "las categorías a disputarse son única y exclusivamente las que están en los afiches... los datos de la tabla son simplemente un filtro"). Las categorías reales, según el afiche (`Mr Republica.jpeg`/`Mr Republica Principiante.jpeg`), son:
  - **Fisiculturismo Clásico** (= Men's Classic Bodybuilding) → **1 sola categoría "Open"**, sin sub-división, para cada marca (principal y Principiante). Cualquier atleta que quiera competir ahí debe cumplir la fórmula de banda-por-estatura como filtro de ELEGIBILIDAD, no como selector.
  - **Classic Physique** (= Men's Classic Physique) → **2 categorías** por marca, exactamente como imprime el afiche: "Hasta 172 cm." y "Sobre 172 cm." (mismo corte y convención que Muscular Men's Physique). Dentro de cada una de esas 2, la elegibilidad de peso se sigue afinando con las 7 bandas oficiales según la estatura real del atleta.
  - Se corrigieron las 28 filas de `categorias`/`eventos_categorias` mal creadas para el evento "Mr. República" (7 bandas × 4 combinaciones disciplina/marca) — eliminadas y reemplazadas por las 6 categorías reales de arriba (2 Open + 2×2 Class A/B). Verificado que ninguna tenía inscritos antes de borrar, y que ninguna otra evento ("Mr. America", "Novatos 22") dependía de esas filas específicas.
  - **Men's Games Classic sigue sin vincularse a ningún evento** — si se activa algún día, aplicar el mismo principio: el afiche manda cuántas categorías reales existen, la tabla de 9 bandas es solo el filtro de peso.
- **Dónde vive la lógica** (duplicada intencionalmente cliente+servidor, no solo por UX sino porque el cliente se puede evadir):
  - Cliente: `_esFisicamenteElegible()` + `_offsetRelacion(disciplina, estatura)` en `views/eventos/inscripcion.ejs` — deshabilita el checkbox desde el render (`renderizarCategorias` ahora recibe `estaturaAtleta`/`pesoAtleta`) y `validarAfinidad()` respeta el atributo `data-bloqueo-fisico` sin re-habilitarlo.
  - Servidor: `_validarElegibilidadFisica()` + `_offsetRelacion()` en `controllers/inscripcionController.js`, llamada desde `guardarInscripcionAsistida` (inscripción asistida) e `inscribirAtleta` (web) usando el peso/estatura real del atleta en BD — esto es lo que realmente impide guardar, el cliente es solo UX.
  - `_offsetRelacion(disciplina, estatura)` **resuelve el offset SIEMPRE por la estatura real del atleta** contra `_BANDAS_TALLA_PESO` (array de bandas `{max, offset}` por disciplina) o `_OFFSET_UNICO` (fórmula continua de Physique Clásico) — nunca por la categoría/división que el atleta eligió. Así una categoría puede ser "Open" (sin bandas propias) y aun así aplicar el filtro de banda correcto según la estatura real.
  - `_normDisc`/`_normW`/`_normDiscValidacion` quitan acentos (`normalize('NFD')` + strip de marcas combinantes vía `String.fromCharCode`, nunca el carácter unicode literal — ver hallazgo #14) para que "Clásico" y "Clasico" comparen igual al buscar el offset.
  - `inscripcionPage` selecciona `parametro, peso_min, peso_max, estatura_min, estatura_max` de `categorias` (antes solo mandaba `modalidad, disciplina, sexo, division, edad_min, edad_max` al cliente).
- **Si se agrega otra disciplina con fórmula propia**, agregar sus bandas a `_BANDAS_TALLA_PESO` (o su offset único a `_OFFSET_UNICO`) en AMBOS archivos (cliente y servidor) — **nunca asumir que comparte la fórmula de otra disciplina similar sin verificarlo contra su propia tabla oficial primero** (Physique Clásico, Classic Physique, Classic Bodybuilding y Games Classic tienen las 4 fórmulas distintas pese a nombres parecidos) — y **nunca crear una fila de `categorias` por banda**: el número de categorías reales lo define el afiche del evento, no la tabla de bandas.
- **Corrección de peso/estatura durante el pesaje (2026-07-31)**: en el modal de inscripción asistida (`inscripcion.ejs`), los campos "Peso (kg)"/"Estatura (cm)" vienen precargados desde `atletas.peso`/`atletas.estatura` pero son editables — al cambiarlos, `_onCambioPesoEstatura()` recalcula en vivo qué categorías quedan elegibles (usa el mismo `_esFisicamenteElegible()`). Al guardar, si se corrigieron, `guardarInscripcionAsistida` los usa para la validación (en vez del valor viejo de BD) y los persiste en `atletas.peso`/`atletas.estatura` — así el pesaje real corrige el perfil, no al revés.

### Presidente de Mesa (silla central) — regla fija, no editable manualmente
El Presidente de Mesa **siempre** es el juez sentado en la silla central del panel 1, según la cantidad de jueces del panel:

| Cantidad de jueces | Silla central (Presidente) |
|---|---|
| 3 | 2 |
| 5 | 3 |
| 7 | 4 |
| 9 | 5 |
| 11 | 6 |

Fórmula: `silla_presidente = Math.ceil(cantidad_jueces / 2)`. Se calcula en `views/eventos/preparacion.ejs` (tarjeta "Configuración de Panel de Jueces") — no hay radio/checkbox manual para elegir presidente, es automático y no se puede sobreescribir. Al guardar, `guardarPanel()` marca `es_presidente = true` solo para la silla central.

### Programa Oficial vs Programa Resumido
Dos documentos imprimibles generados desde el mismo dato (`eventos.cronograma_mc` + roster de jueces/invitados), servidos por `_construirPrograma()` en `eventosController.js`:
- **Programa Oficial** (`/eventos/:id/programa-oficial`): incluye tabla de atletas (nombre, ciudad, team, dorsal) por cada categoría.
- **Programa Resumido** (`/eventos/:id/programa-resumido`): mismo guion (categorías + actividades + roster de jueces/staff/patrocinadores/personalidades) pero **sin** la tabla de atletas — solo nombre de categoría y conteo/rango de dorsales.
- Ambos requieren que el evento ya haya sido oficializado (`cronograma_mc` poblado) y usan el permiso `programa`/`ver` (incluye admin, ejecutivo, estadístico y mc).
- Botones de acceso en `centro_mando.ejs`, habilitados solo cuando el evento salió de fase de preparación.

---

## Flujo de operación el día del evento (cronograma completo, verificado 2026-07-31)

### Fase 1 — Antes del evento: inscripción y pesaje
1. **Inscripción asistida** (`/inscripcion?evento=:id`, `guardarInscripcionAsistida`): staff busca al atleta (nombre/cédula/QR), abre el modal, selecciona categorías afines, confirma peso/talla. Requiere `evento.estado` en `inscripcion`|`pesaje`. Crea filas en `competidores` con `estatus_pesaje='aprobado'`.
2. **Cierre de pesaje**: no es un botón único — el evento pasa de `inscripcion`/`pesaje` a `en_progreso` recién en el paso 4 (oficializar preparación). Antes de eso se puede seguir inscribiendo/corrigiendo pesaje libremente.

### Fase 2 — Preparación del programa (`/eventos/:id/preparacion`)
3. **Orden de salida**: arrastrar (⣿) o escribir el número de orden mueve categorías/actividades a esa posición — el número siempre se deriva de la posición, nunca se asigna suelto, así que no puede haber duplicados.
4. **Panel de jueces**: elegir cantidad (3/5/7/9/11), asignar jueces por silla. La silla central queda marcada automáticamente como Presidente de Mesa (ver regla arriba) al guardar.
5. **Invitados especiales**: cargar jueces fuera del panel, staff, patrocinadores, personalidades (para que el MC los mencione en la apertura).
6. **Oficializar**: botón "OFICIALIZAR LISTADOS Y GENERAR DORSALES" → asigna `numero_atleta` correlativo por categoría en el orden definido, cambia `evento.estado` a `en_progreso`, y publica `eventos.cronograma_mc` (consumido por Monitor MC y Backstage).

### Fase 3 — Show en vivo
7. **Backstage** (`/eventos/:id/backstage`): siguiente atleta por dorsal.
8. **Votación**: dos caminos independientes que alimentan la misma `votaciones_jueces`:
   - **Boleta digital del juez** (`/eventos/:id/votacion`): el juez ve SIEMPRE la categoría de menor `orden_secuencia_categoria` que siga `abierta activa` (no hay forma de "empujar" una categoría específica salvo cerrar/fusionar las anteriores). Requiere sesión con **MFA (AAL2)** — la política RLS `Votos_Insert_Seguro_MFA` de `votaciones_jueces` rechaza el INSERT si el juez no tiene `aal2` en su JWT (solo `admin` puede insertar sin MFA). **No hay flujo de enrolamiento de MFA para jueces en la app** — hasta que exista, la boleta digital es inviable para jueces reales; el canal que sí funciona hoy es el siguiente.
   - **Digitación asistida** (`/estadisticas/mesa-computo/:eventoCatId`): el estadístico teclea directo en la matriz los votos de boletas físicas, por juez y atleta — no depende de RLS ni de MFA (la página lee/escribe todo vía `supabaseAdmin` en el servidor salvo el guardado final).
9. **Cómputo**: botón "COMPU-ESTADÍSTICA" corre el algoritmo IFBB en el navegador sobre lo digitado; "OFICIALIZAR RESULTADOS" solo se habilita si la fase es `final_r1`/`final_r2` y guarda `posicion_final`/`puntos_totales` vía `supabaseAdmin`.
10. **Monitor MC** (`/eventos/:id/monitor-mc`): solo lectura, recibe resultados cuando el estadístico los envía ("ENVIAR RESULTADOS AL MC").
11. **Absolutos** (`/estadisticas/:idEvento/absolutos`): aparece un grupo por cada disciplina+modalidad con 2+ divisiones ya oficializadas. Se abre la Mesa de Cómputo de Absolutos, se vota entre los campeones de división, se oficializa el ganador (`es_ganador_absoluto=true`, +11 puntos al team en el ranking calculado al vuelo).

### Fase 4 — Resultados e impresión
12. **Por categoría**: `reporte_oficial.ejs` (acta protocolar, solo posiciones si `evento.estado==='finalizado'`) o `/inscripcion/listado-posiciones/:eventoId` (listado plano, funciona apenas se oficializa cada categoría, no espera a que cierre el evento).
13. **Por absoluto**: `/estadisticas/:idEvento/imprimir-absolutos` (agregado 2026-07-31).
14. **Por equipo**: `/preparadores/imprimir-ranking-teams/:idEvento` (agregado 2026-07-31) — puntos por posición (7/5/4/3/2/1 para 1°-6°) + 11 por absoluto, calculado en vivo, no hay tabla de ranking persistida.
15. **Certificados**: individual en `/estadisticas/certificado-preview/:idCompetidor` (vista reconstruida 2026-07-31, estaba vacía), o masivo en `/estadisticas/imprimir-certificados/:eventoId`.
16. **Cierre**: Resultados al Salón de la Fama.

---

## Eventos fusionados (dos marcas, un solo evento técnico)

Patrón usado por primera vez el 2026-07-31 para **"XXXVII Mr. República Dominicana 2026 + XI Mr. República Principiante"** (pesaje sábado 1 de agosto, competencia domingo 2 de agosto 2026, Teatro La Fiesta — Hotel Jaragua). Aplica quando dos afiches/marcas comparten logística (mismo día, mismo escenario, mismos jueces) pero deben coronar campeones y emitir certificados/listados **separados** por marca.

- **Un solo `eventos` row.** Todo se opera al unísono: mismo pesaje, mismo panel de jueces, mismo `cronograma_mc`, mismo `oficializarPreparacion`.
- **Categorías 100% duplicadas por marca**, aunque los parámetros (peso/estatura) sean idénticos entre ambas — así cada marca tiene su propio podio/certificado, sin compartir resultado. La marca secundaria usa `disciplina = "{Disciplina} {Coletilla}"` (ej. `"Men's Bodybuilding Principiante"`), NUNCA se sufija `modalidad` ni `nombre` de división — solo `disciplina`.
- **`GRUPOS_AFINIDAD`** (en `inscripcion.ejs` e `InscripcionAtleta.ejs`) debe incluir la disciplina sufijada en el MISMO grupo que su base (ej. `"Men's Bodybuilding Principiante"` dentro de `culturismo_m` junto a `"Men's Bodybuilding"`) — así un atleta puede marcar ambas versiones en la misma visita (la marca secundaria "abre hacia arriba" a la principal). Si el afiche incluye Fit Pairs/Mixed Pairs sufijado, extender también el bloque especial `_FIT_PAIRS_N`/`_FIT_PAIRS_W` (ver commit 56560b5).
- **La regla inversa ("la marca principal NO puede competir en la secundaria") es criterio del staff en inscripción asistida, no se aplica por código** — no existe ningún campo en `atletas` que indique nivel/experiencia del atleta, así que no hay forma de bloquearlo automáticamente. Decisión explícita del usuario 2026-07-31: no vale la pena agregar ese campo solo para esto.
- **Publicación separada (afiches, listados por marca) queda pendiente como fase 2** — por ahora ambos afiches se subieron a `eventos-banners` (`url_afiche_evento` = marca principal, `url_afiche_pesaje` = marca secundaria) pero la galería pública / listados aún muestran el evento como uno solo. Ver [[evento_fusionado_mr_republica]] en memoria del proyecto para el estado exacto y qué falta.

---

## Mapa de rutas clave
| Ruta | Rol | Descripción |
|---|---|---|
| `/` | Público | Landing / index |
| `/atletas/perfil` | atleta | Perfil, carnet, historial |
| `/afiliacion` | general | Registro de atleta |
| `/categorias/crearCategoria` | admin/ejecutivo | Crear disciplinas, divisiones, categorías |
| `/categorias/nuevoEvento` | admin/ejecutivo | Crear evento |
| `/inscripcion/asistida` | admin/ejecutivo | Pesaje + inscripción admin |
| `/eventos/InscripcionAtleta` | atleta | Inscripción web |
| `/eventos/centro-mando` | admin/ejecutivo | Dashboard operativo del evento |
| `/eventos/:id/preparacion` | admin/ejecutivo/estadístico | Orden de salida, panel de jueces, invitados especiales, oficializar |
| `/eventos/:id/programa-oficial` | admin/ejecutivo/estadístico/mc | Guion imprimible completo (con atletas) |
| `/eventos/:id/programa-resumido` | admin/ejecutivo/estadístico/mc | Guion imprimible sin atletas (solo estructura + roster) |
| `/eventos/[id]/monitor-mc` | mc | Monitor del locutor |
| `/eventos/:id/presidente-mesa-actual` | estadístico | Auto-detecta categoría activa → redirige a Presidente de Mesa |
| `/estadisticas/presidente-mesa/:eventoCatId` | estadístico | Marcar clasificados, enviar al MC/Backstage |
| `/estadisticas/mesa-computo/[id]` | estadistico/juez | Votación y cómputo |
| `/estadisticas/mesa-computo-absoluto` | estadístico | Cómputo del duelo de campeones (query params evento/disciplina/modalidad) |
| `/estadisticas/gestion-absolutos` | estadistico | Campeones y puntos team |
| `/estadisticas/:idEvento/imprimir-absolutos` | reportes:ver | Impresión oficial de resultados de Absolutos |
| `/preparadores/imprimir-ranking-teams/:idEvento` | reportes:ver | Impresión oficial de ranking de equipos por evento |
| `/inscripcion/listado-posiciones/:eventoId` | pesaje:ver | Listado oficial de posiciones por categoría (imprimible) |
| `/social/muro` | todos | Muro social (feed + publicar para atletas) |
| `/social/noticias` | todos | Comunicados oficiales |
| `/social/noticias/crear` | admin/ejecutivo | Publicar nueva noticia |
| `/fotografo/upload` | admin/fotografo | Subir fotos atléticas por evento |
| `/eventos/historico` | público | Salón de la fama |
| `/eventos/:id/broadcast-live` | admin/estadistico | Panel VMD (Director de Video y Multimedia) |
| `/eventos/:id/lower-third` | público (OBS) | Overlay lower third para browser source |
| `/eventos/:idEvento/entrada/:idAtleta` | admin/estadistico/mc | LED Wall pantalla completa |

---

## Estado de módulos
- [x] Auth (login, roles, sesión, cookies)
- [x] Layout (topbar + sidebar colapsable con localStorage)
- [x] Categorías (disciplinas con grupo_afinidad, divisiones con parametro, crear categoría)
- [x] Eventos (crear evento, inscripción asistida con filtro edad/sexo/afinidad, pesaje)
- [x] DJ Virtual (subida de música en pesaje, reproductor)
- [x] Mesa de Cómputo (votación jueces, algoritmo IFBB)
- [x] Gestión de Absolutos
- [x] Preparadores (afiliación, habilitación)
- [x] Módulo 7 — Atletas: perfil completo, listado admin, historial competitivo
- [x] Módulo 8 — Backstage y Seguridad (scanner QR, llamado a tarima)
- [x] Módulo 9 — Admin (registro_staff CRUD, reporte-caja, auditoría-pagos)
- [x] Módulo 10 — Social (muro completo, noticias, galería fotógrafo)
- [x] Módulo 11 — Preparadores: panel de coach, puntos team, ranking
- [x] Módulo 12 — Modo Kiosko (pantalla completa, PIN de salida)
- [x] Módulo 13 — Broadcast (lower thirds, TTS, efectos LED, panel VMD, overlay OBS)
- [x] Módulo 14 — Presidente de Mesa (fases de competencia, Top 5 comparación, clasificados al MC)
- [x] Módulo 15 — Programa del evento: orden de salida por posición (drag & drop, sin duplicados posibles), Presidente de Mesa automático por silla central, roster de invitados especiales (jueces no-panel/staff/patrocinadores/personalidades), Programa Oficial y Programa Resumido imprimibles
- [x] Módulo 16 — Auditoría completa del flujo de competencia (2026-07-31): inscripción asistida, pesaje, votación por fases (eliminatoria/semifinal/final/absoluto), impresión de resultados por categoría/absoluto/equipo. Ver "Hallazgos críticos corregidos" abajo — se encontraron y corrigieron 6 bugs que impedían el funcionamiento real de inscripción, votación de jueces y listados oficiales.

### ⚠️ Hallazgos críticos corregidos en la auditoría (2026-07-31)
Encontrados probando el flujo real en navegador (no solo leyendo código) — todos confirmados con evidencia (error reproducido, luego corregido y re-probado):

1. **`views/eventos/boleta.ejs` usaba `process.env.SUPABASE_KEY`** (variable inexistente) en vez de `SUPABASE_ANON_KEY` vía locals — el voto digital del juez nunca se guardaba. Corregido, pero ver hallazgo #2 (sigue bloqueado por MFA).
2. **RLS de `votaciones_jueces` exige MFA (`aal2`)** para insertar votos, salvo rol `admin`. Ningún juez real tiene MFA enrolado (no existe esa UI) → **la boleta digital del juez es inviable en producción tal como está**. El camino que sí funciona es la "digitación asistida" en la Mesa de Cómputo (server-side, `supabaseAdmin`). No se debilitó la política — es una decisión de seguridad legítima, pero requiere decidir: construir enrolamiento de MFA para jueces, o aceptar que la digitación asistida es el único canal real.
3. **`verBoletaJuez` usaba el cliente `supabase` (anon) sin JWT del usuario** — la política RLS `Sillas_Lectura_Propia` (`auth.uid() = juez_id`) nunca se cumplía desde el servidor, así que ningún juez podía encontrar su silla asignada. Corregido a `supabaseAdmin` (la ruta ya está protegida por `checkRole` a nivel Express).
4. **Fase de votación inconsistente entre 4 funciones** (ver sección "Fases de competencia" arriba) — corregido con `resolverFaseAutomatica()` único.
5. **`competidores.monto_total`/`uso_oferta` no existían en la BD** (sin migración registrada que las quitara) — rompía inscripción asistida real y listados oficiales. Restaurado vía `migrations/008_restaurar_monto_total_competidores.sql`.
6. **DataTables `bs4-4.1.1` sobreescribía `window.bootstrap` con Bootstrap 4**, cargándose después del Bootstrap 5.2.2 real en `cabecera.ejs` — rompía **todo** modal/dropdown/etc. de Bootstrap 5 en cualquier página del sitio (confirmado: `new bootstrap.Modal()` creaba una instancia v4 que no mostraba nada visualmente con el CSS v5 cargado). Corregido reordenando los `<script>`.
7. **`oficializarCategoria` no validaba la fase** antes de grabar `posicion_final` — se podía oficializar una ronda eliminatoria/semifinal por error como resultado definitivo. Ahora exige `final_r1`/`final_r2`.
8. **Cómputo de Absolutos sin desempate por Relative Placement** (a diferencia de la Mesa de Cómputo normal) — agregado.
9. **`views/reportes/certificado.ejs` estaba vacío (0 bytes)** — certificado individual en blanco. Reconstruido.
10. Faltaban vistas imprimibles de **resultado de Absoluto** y de **ranking de equipo por evento** — no existían, se construyeron.
11. **"Presidente de Mesa" no estaba enlazado desde ninguna vista** — se agregó acceso desde Centro de Mando.
12. **`guardarInscripcionAsistida` intentaba grabar `atletas.juez_firma_id`** (columna inexistente) junto con `descargo_firmado`/`fecha_firma_descargo` (reales) — un UPDATE con una sola columna inválida falla completo en Postgres, así que el descargo firmado nunca quedaba registrado tras ninguna inscripción exitosa (esto solo apareció en los logs del servidor, la respuesta HTTP seguía devolviendo éxito). Se quitó el campo inexistente.
13. **`views/jueces/espera.ejs` no existía** — `verBoletaJuez` la renderiza cuando un juez autenticado aún no tiene silla asignada; esa ruta estaba enmascarada por el hallazgo #3 (antes ni siquiera se llegaba ahí). Creada.
14. **`views/eventos/inscripcion.ejs` tenía 94 comillas tipográficas (U+2018/U+2019 `‘'`) usadas como delimitadores de string/selector en el bloque `GRUPOS_AFINIDAD`/`validarAfinidad` (~líneas 551-683)** — hallazgo post-auditoría, reportado en vivo por el usuario el 2026-07-31 desde producción ("click en Inscribir no hace nada", consola: `SyntaxError: Invalid or unexpected token`, `abrirModalDesdeBoton is not defined`). **Regla clave de JS: un `SyntaxError` en cualquier punto de un `<script>` impide que se ejecute TODO el bloque, incluido el código anterior al error** — por eso `abrirModalDesdeBoton`, `abrirModalInscripcion`, `renderizarCategorias` y el resto del motor de afinidad (~30KB de código) nunca quedaban definidos en `window`, aunque el error de sintaxis estuviera 200+ líneas más abajo. Corregido reemplazando las 94 ocurrencias por comillas rectas (`'`). Verificado que ningún otro `.ejs`/`.js` del proyecto tiene el mismo patrón. **Nota retrospectiva:** esto probablemente explica también el comportamiento "raro" observado durante la auditoría original (funciones que aparecían `undefined` vía eval) — no era un problema de scoping, era este mismo error de sintaxis ya presente en ese momento.

**No se tocó** (fuera de alcance, código legacy): `verCalculosEvento`/`calculos.ejs` (superado por Mesa de Cómputo).

### Estación de Pesaje (`/inscripcion/pesaje`) — historial y arreglo (2026-07-31)
`pesajePage`/`eventos/pesaje.ejs` **sí está enrutado y en uso real** (el usuario lo usa en producción para el pesaje físico del día del evento) — una nota anterior que decía "no enrutado desde ninguna vista activa" era incorrecta. Se encontraron y corrigieron dos problemas graves el mismo día:
1. **Guardaba en una tabla huérfana.** Su guardado original (`_supabase.from('inscripciones').upsert(...)`) escribía en `inscripciones` — DISTINTA de `competidores`/`atletas` (lo que usa todo el resto del sistema). Esa tabla tenía una sola fila en toda su historia, sin `atleta_id` ni `evento_cat_id`. Cualquier "pesaje" hecho ahí se perdía silenciosamente.
2. **Permitía pesar al mismo atleta indefinidamente**, sin ningún aviso ni bloqueo.
**Arreglado**: se agregaron `atletas.pesaje_evento_id` / `atletas.pesaje_fecha` (migración `009_pesaje_evento_atletas.sql`) para saber si un atleta ya fue pesado **para un evento específico** (no es un estado global — el mismo atleta puede necesitar pesarse de nuevo en otro evento). Nuevo endpoint `POST /inscripcion/pesaje/guardar` (`guardarPesajeEstacion`, vía `supabaseAdmin`) persiste en `atletas.peso`/`estatura` (los mismos campos que ya lee `inscripcion.ejs` para elegibilidad física) y marca `pesaje_evento_id`. La vista ahora muestra dos botones por atleta: **PESAR** (deshabilitado si ya se pesó para el evento actual) y **EDITAR** (habilitado solo entonces, precarga los valores actuales para poder corregir un error real sin crear un pesaje duplicado).
