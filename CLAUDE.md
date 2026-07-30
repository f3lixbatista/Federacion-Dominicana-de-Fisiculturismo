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
3. **Respuestas del asistente:** siempre en **español**.
4. **Apostrofes en datos de BD:** pueden ser curvos (`'` U+2019) o rectos (`'` U+0027). Siempre normalizar antes de comparar strings con nombres de disciplinas.

---

## Tablas Supabase principales

### `atletas`
```
id (uuid), nombre, cedula, sexo (M|F), fecha_nacimiento, estatura (cm), peso (kg),
idfdff, estatus_afiliacion (pendiente|habilitado|suspendido), preparador_id, foto_url,
instagram, gimnasio, preparador, celular, telfijo, email_preparador, celular_preparador,
provincia, municipio, sector, calle, pais, postal, nacionalidad, pasaporte, ocupacion,
categoria, fecha_inscripcion, fecha_ultima_renovacion
```
- Columna de fecha de nacimiento: **`fecha_nacimiento`** (no `nacimiento`)
- `afiliacion.ejs` usa `name="nacimiento"` en el form pero el JS lo mapea a `fecha_nacimiento` antes de enviar → correcto
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
id, atleta_id, evento_cat_id, id_evento, juez_id,
estatus_pesaje (pendiente|aprobado), numero_competidor,
monto_total, uso_oferta, musica_url, salida
```

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
| `physique_m` | Men's Physique, Men's Fit Model, Men's Fitness | Fit Pairs (pareja esperada: Women's Bikini) |
| `muscular_m` | Muscular Men's Physique | — sin afines |
| `bikini_f` | Women's Bikini, Women's Fit Model, Women's Artistic Fitness | Fit Pairs (pareja esperada: Men's Physique) |
| `wellness_f` | Women's Wellness, Women's Fit Model | — |
| `bodyfitness_f` | Women's Bodyfitness, Women's Acrobatic Fitness | — |
| `physique_f` | Women's Physique | Mixed Pairs (pareja esperada: Men's Bodybuilding) |
| `children_m` | Male Children Fitness | — |
| `children_f` | Female Children Fitness | — |

> **Women's Fit Model es puente parcial**: aparece en `bikini_f` y en `wellness_f`. No une ambos grupos — la primera categoría elegida determina el grupo activo. Bikini + Fit Model = el grupo es `bikini_f`, Women's Wellness queda bloqueada (y viceversa).

> **Fit Pairs / Mixed Pairs**: la categoría tiene `sexo = 'F-M'` y es visible para todos. Su grupo de afinidad depende del sexo del atleta: atleta masculino → pertenece a `physique_m`; atleta femenino → pertenece a `bikini_f`. Mixed Pairs: masculino → `culturismo_m`; femenino → `physique_f`.

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
- Se eliminan el voto más alto y más bajo de cada atleta
- Se suman los votos restantes → menor puntaje = mejor posición
- Empates se resuelven por Relative Placement
- Implementado en `services/votingService.js`

### Precios (Early Bird)
- Si la fecha actual ≤ `eventos.fecha_limite_oferta` → precios de oferta
- 1ra categoría paga `costo_primera_cat` (o `costo_oferta_primera`)
- Categorías adicionales pagan `costo_adicional` (o `costo_oferta_adicional`)

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

## Flujo de operación el día del evento
1. **Pesaje** (`/inscripcion/asistida`): Staff escanea QR o busca atleta, registra peso/talla, selecciona categorías, genera dorsal
2. **Centro de Mando** (`/eventos/centro-mando`): Admin gestiona orden de salida, fusión de categorías por cuórum, dorsaleo
3. **Backstage** (`/eventos/[id]/backstage`): Muestra próximos atletas por dorsal
4. **Mesa de Cómputo** (`/estadisticas/mesa-computo/[id]`): Jueces votan en tablet, estadístico ejecuta algoritmo IFBB
5. **Monitor MC** (`/eventos/[id]/monitor-mc`): Solo lectura, recibe resultados cuando estadístico los envía
6. **Absolutos** (`/estadisticas/gestion-absolutos`): Duelo de campeones de oro, asignación de 11 puntos al team
7. **Cierre**: Resultados al Salón de la Fama, certificados en perfil del atleta

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
| `/estadisticas/mesa-computo/[id]` | estadistico/juez | Votación y cómputo |
| `/estadisticas/gestion-absolutos` | estadistico | Campeones y puntos team |
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
