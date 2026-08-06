# Roadmap: FDFF → SaaS Global IFBB

> Documento de visión y evolución futura. **No es un plan de implementación activo** — el trabajo aquí descrito arranca solo después de que el sistema FDFF actual (República Dominicana) esté probado y confirmado sin errores conocidos. Mientras tanto, este archivo es el punto de partida para retomar la conversación cuando llegue el momento.

## 1. Estado actual vs. visión

**Hoy:** FDFF es una app single-tenant (Node/Express + EJS + Bootstrap, Supabase) que gestiona una sola federación nacional — República Dominicana.

**Visión:** una plataforma SaaS que sirva a toda la estructura mundial de la IFBB, donde cada organización (desde IFBB hasta una asociación local) opera de forma independiente pero conectada a la jerarquía real de la federación.

**Validación real con stakeholders (2026-08-06):** esto no es una idea especulativa sin tracción — el usuario ya conversa casi semanalmente con el presidente de la Confederación Centroamericana y del Caribe de Fisiculturismo (CAC), que es a la vez presidente de FDFF, y también ha conversado con el presidente de la IFBB, quien está a la espera de que el usuario termine de probar el sistema y lo ponga en producción en un evento local para evaluar el resultado antes de considerar algo mayor. Esto refuerza el orden de las etapas (§6): probar con FDFF-RD primero, escalar después — es literalmente lo que los stakeholders reales están esperando ver.

## 2. Estructura organizacional real (jerarquía piramidal)

```
IFBB (mundial — amateur + profesional)
 └─ Confederaciones continentales        (ej. Confederación Panamericana de Físico-Culturismo)
     └─ Confederaciones regionales       (ej. Confederación Centroamericana y del Caribe)
         └─ Federaciones nacionales      (ej. FDFF-RD, México, Venezuela, Colombia, Puerto Rico, Curazao...)
             └─ Asociaciones locales/distritales   (ej. dentro de México: Guerrero, Monterrey, Nogales, Durango, Coahuila...)
```

Reglas de negocio confirmadas por el usuario:

- **Cada nivel opera como entidad independiente** — su propia membresía (atletas), sus propios jueces, su propio staff, sus propios eventos, su propia directiva. No es una jerarquía puramente administrativa, cada nodo es "como una empresa aparte".
- **La membresía de atletas se propaga automáticamente hacia arriba.** Un atleta afiliado a una asociación local en México es, por ese solo hecho, miembro de la Federación Mexicana, que a su vez es miembro de la Confederación Centroamericana y del Caribe, hasta llegar a IFBB. No se re-registra en cada nivel — la pertenencia se hereda por la cadena.
- **Multi-pertenencia real, pero acotada a elegibilidad de eventos — NO es membresía duplicada.** Aclarado por el usuario (2026-08-06): países como México (Norteamérica + Centroamérica), Venezuela y Colombia (Sudamérica + Caribe) pertenecen a dos confederaciones — esto **solo** significa que sus atletas están aptos para competir en eventos internacionales de ambas regiones, **siempre que sea la federación nacional quien los inscriba** (no una asociación local directamente). No implica que la membresía se duplique ni se propague por dos caminos distintos.
- **Elegibilidad por nivel de evento, con restricción estricta hacia abajo.** Hay eventos panamericanos, centroamericanos, nacionales y de asociación, cada uno con su propia regla de restricción. Regla confirmada: un atleta miembro de República Dominicana **no puede** competir en un evento nacional o de nivel inferior de otro país (ej. Venezuela) — esos eventos están cerrados a los miembros de esa federación nacional específica (y sus asociaciones locales). Los eventos de nivel regional/continental sí están abiertos a las federaciones nacionales elegibles dentro de esa confederación (incluyendo las de doble afiliación, vía inscripción de su federación nacional).
- **Visibilidad hacia abajo:** las organizaciones de rango superior pueden VER actividad (eventos, atletas, jueces) de las organizaciones de rango inferior en su cadena. Alcance exacto (¿solo lectura o también algo administrativo?) — pendiente de confirmar.

## 3. Requisitos técnicos ya confirmados

### 3.1 PWA offline-first (requisito duro, no "nice to have")
Motivo real: en eventos en vivo el internet puede fallar, y la computadora de la mesa de estadísticas debe seguir funcionando sin conexión, sincronizando con la base de datos automáticamente al recuperar conectividad.

**Alcance aclarado por el usuario (2026-08-06) — más simple de lo que se asumió inicialmente:** si cae el internet, la votación pasa a ser **manual/en papel** (los jueces llenan boletas físicas, igual que hoy) — **solo la computadora de la mesa de estadísticas** necesita seguir funcionando offline para digitar esas boletas físicas y sincronizar después. No es un escenario de múltiples dispositivos (jueces + estadística) offline a la vez necesitando resolver conflictos de sincronización entre ellos — es un solo dispositivo, un solo escritor, mismo patrón que ya usa la "digitación asistida" actual de la Mesa de Cómputo (ver `CLAUDE.md` del proyecto, sección "Fases de competencia"). Esto reduce bastante el riesgo técnico frente a lo que se asumió al principio (ver §5, sub-proyecto 2).

**Ya existe un patrón validado y en producción para esto** — el usuario ya lo construyó en su otro proyecto, GlobalXpert/ERP Xpert: frontend React + Vite con Dexie (wrapper de IndexedDB) para almacenamiento local y repositorios de sincronización dedicados (`frontend/src/lib/db.ts`, `cobradorOfflineRepository.ts`, `ncfOfflineRepository.ts`), usado hoy para cobradores de campo sin conectividad. Reusar ese mismo patrón para el motor offline de la mesa de estadísticas, en vez de diseñar uno nuevo desde cero.

### 3.2 Migración de framework
Razón que dio el usuario inicialmente ("los frameworks cargan más rápido y cometen menos errores") es una generalización imprecisa — EJS/MPA puede ser igual de rápido para la mayoría de las pantallas actuales de FDFF. **La razón real y sólida es otra:** un patrón offline-first con UI optimista + permisos jerárquicos complejos (ver §2) es mucho más difícil de construir bien sobre un MPA de recarga completa que sobre una SPA con estado en cliente + service worker. Esa es la justificación técnica real para migrar, no la velocidad de carga en sí.

### 3.3 Recomendación de stack (a confirmar, no cerrada)
Reusar el mismo patrón ya validado en GlobalXpert en vez de introducir un tercer stack que aprender/mantener aparte:
- **React + Vite**, PWA vía `vite-plugin-pwa`
- Frontend habla **directo a Supabase vía RLS** (no todo pasa por un backend propio)
- **Dexie/IndexedDB** para el motor offline-first
- **Backend Express delgado**, solo para lo que el cliente no puede hacer (PDFs, email/WhatsApp, cron) — mismo rol que cumple `erp-xpert-backend` hoy

Implicación importante: hoy FDFF confía en `supabaseAdmin` dentro de los controllers para casi toda la lógica sensible (voto de jueces, resultados, etc.), no en RLS. Migrar a "cliente habla directo con Supabase" exige rediseñar ese modelo de permisos como políticas RLS reales — no es solo un cambio de plantillas visuales.

## 4. Decisiones de arquitectura pendientes

Estas preguntas cambian el diseño del modelo de datos de raíz — deben resolverse **antes** de diseñar tablas o RLS, no durante:

1. ~~¿Jerarquía como árbol estricto o grafo real?~~ **Resuelto (2026-08-06):** árbol estricto de un solo padre administrativo por nodo (determina membresía en cascada y reporte). La doble pertenencia tipo México/Venezuela/Colombia **no** es multi-padre en el árbol — es una relación aparte, de "afiliación adicional" con propósito único: elegibilidad para inscribir atletas (vía su federación nacional) en eventos de una segunda confederación. Recomendación técnica: modelar como tabla muchos-a-muchos `federacion_confederacion_afiliada` separada del árbol jerárquico principal, más una regla de elegibilidad por `eventos.nivel` (nacional/asociación = cerrado a la federación dueña del evento; regional/continental = abierto a las federaciones nacionales elegibles, incluidas las de doble afiliación).
2. **Alcance de la visibilidad hacia abajo:** ¿solo lectura (ver eventos/atletas/jueces), o también algún tipo de capacidad administrativa/override sobre niveles inferiores? — sigue abierta.
3. **Modelo de negocio / billing:** ¿quién paga la suscripción en cada nivel? ¿IFBB paga por toda la estructura, o cada federación nacional/local paga la suya de forma independiente? — sigue abierta.
4. **Alcance de la migración:** ¿se migra TODO FDFF de una sola vez al nuevo stack, o se construye el SaaS multi-tenant desde cero y FDFF-RD pasa a ser simplemente el primer tenant migrado (permitiendo validar con datos reales antes de escalar)? — sigue abierta, aunque el contexto de §1 (IFBB esperando ver primero un evento local en producción) apunta a la segunda opción.
5. **Idioma:** el alcance es internacional (ej. Curazao es de habla neerlandesa/papiamento) — ¿hace falta soporte multi-idioma desde el diseño inicial, o se lanza en español y se agrega después? — sigue abierta.

## 5. Sub-proyectos identificados

Esto no es un solo proyecto — es una plataforma. Cuando llegue el momento, cada uno de estos debe pasar por su propio ciclo de diseño (spec) → plan → implementación, no intentarse de una sola pasada:

1. **Modelo de datos jerárquico + autenticación multi-tenant** (la base de todo lo demás — depende de las decisiones §4.1 y §4.2)
2. **Motor offline-first de la mesa de estadísticas** (un solo dispositivo/escritor, sin conflictos de sincronización entre múltiples equipos — ver §3.1. Menos riesgoso de lo que se asumió al principio, pero sigue siendo el requisito más nuevo para FDFF; candidato a prototipar primero y de forma aislada)
3. **Migración de las features existentes de FDFF** al nuevo stack (depende de la decisión §4.4)
4. **Billing/suscripciones** (depende de la decisión §4.3)

## 6. Etapas propuestas (alto nivel, futuro)

> **Gate de entrada:** ninguna de estas etapas arranca hasta que el sistema FDFF actual esté estable y probado, sin errores conocidos pendientes (ver hallazgos abiertos en `CLAUDE.md` — MFA de jueces, roles `mc`/`backstage` en el ENUM, etc.).

- **Etapa 0 — Estabilización:** cerrar los hallazgos críticos pendientes del sistema actual antes de tocar arquitectura nueva.
- **Etapa 1 — Resolver decisiones de arquitectura:** responder las 5 preguntas de §4 con el usuario.
- **Etapa 2 — Diseño del modelo de datos jerárquico + multi-tenancy:** spec dedicado, incluye políticas RLS para la visibilidad en cascada.
- **Etapa 3 — Prototipo del motor offline-first:** validar el patrón de Dexie + sync reusado de GlobalXpert contra el caso de uso real de votación/puntuación, antes de comprometerse a migrar todo lo demás.
- **Etapa 4 — Migrar FDFF-RD como primer tenant** sobre el nuevo stack (valida con datos y uso real antes de escalar a otras federaciones).
- **Etapa 5 — Onboarding de más organizaciones** (otras federaciones nacionales/confederaciones) + billing.

## 7. Reuso conocido de GlobalXpert/ERP Xpert

Cosas que ya están resueltas y probadas en producción ahí, para no reinventarlas:
- Setup de PWA (`vite-plugin-pwa`, manifest, service worker)
- Patrón offline-first con Dexie + repositorios de sincronización
- Patrón "frontend habla directo a Supabase vía RLS + backend Express delgado solo para efectos secundarios"
