# Revisión final Pronostix — Mundial 2026

Fecha: 2026-06-18

## Objetivo

Dejar el sistema estable para operación durante el Mundial, sin refactors grandes y sin cambios de estructura de base de datos. Esta revisión se concentró en pruebas automatizadas posibles desde el repositorio, validación de lógica crítica, documentación operativa y correcciones cosméticas de bajo riesgo.

## Alcance ejecutado

- Validación de premios y rankings con pruebas automatizadas locales.
- Smoke test automatizado de registro/validaciones de Auth existentes.
- Revisión estática de sintaxis JavaScript.
- Revisión de textos visibles en Administración.
- Revisión documental de seeds oficiales, orden SQL y backlog post Mundial.
- No se ejecutaron pruebas contra Supabase productivo ni se alteró la estructura de base de datos.

## Fase 1 — Validación de premios

Configuración validada en pruebas:

- Inscripción: 200 MXN.
- Comisión admin: 10%.
- 1° lugar: 50%.
- 2° lugar: 25%.
- 3° lugar: 15%.

La lógica actual calcula premios sobre la bolsa total y la comisión admin completa el 100% de distribución. Con 3 participantes, por ejemplo:

- Bolsa total: 600 MXN.
- Comisión admin: 60 MXN.
- Bolsa neta/premios: 540 MXN.
- 1° lugar: 300 MXN.
- 2° lugar: 150 MXN.
- 3° lugar: 90 MXN.

Casos automatizados agregados en `tests/rankings-prize.test.js`:

1. Un solo ganador: correcto.
2. Empate en primer lugar: correcto, el premio del primer lugar se divide entre empatados.
3. Empate en segundo lugar: correcto, el premio del segundo lugar se divide entre empatados.
4. Empate en tercer lugar: correcto, el premio del tercer lugar se divide entre empatados.
5. Empate múltiple: correcto, cada posición reparte solo su bolsa entre sus ganadores.
6. Sin ganadores en alguna posición: correcto, se muestra sin ganador y no asigna monto individual.
7. Ranking general: correcto, incluye todos los usuarios.
8. Ranking oficial: correcto, filtra únicamente usuarios con pago `PAGADO`.

No se detectaron errores en la lógica de premios durante la prueba local.

## Fase 2 — Smoke test completo

### Auth

Automatizado con `tests/auth-register-validation.test.js`:

- Registro válido: pasó.
- Registro duplicado: pasó.
- Username inválido: pasó.
- Correo en username: pasó.
- Display name vacío: pasó.
- Contraseña corta: pasó.
- Traducción de error técnico de Supabase: pasó.

No se ejecutaron login, logout, recuperación o cambio de contraseña contra Supabase real desde este entorno porque requiere credenciales/sesiones de un proyecto activo.

### Pronósticos

Revisión estática/sintaxis ejecutada. No se modificó lógica de captura individual, guardar todo, bloqueo por partido ni persistencia.

### Especiales

Revisión estática/sintaxis ejecutada. Se conservan:

- Captura de campeón.
- Captura de subcampeón.
- Captura de tercer lugar.
- Captura de goleador.
- Autocomplete con validación por ID existente.
- Bloqueo automático.
- Desbloqueo manual controlado desde Administración.

### Rankings

Prueba automatizada agregada para ranking general, ranking oficial, empates y premios. Pasó correctamente.

### Administración

Se corrigieron únicamente textos visibles de bajo riesgo:

- “Usuarios dummy” pasó a “Usuarios de prueba”.
- “Schema”, “Seeds” y “Reset” visibles en tarjetas de ayuda pasaron a “Estructura”, “Datos base” y “Limpieza”.

No se modificó lógica de pagos, roles, resultados, especiales ni mantenimiento.

## Fase 3 — Validación móvil

Se conserva el hardening responsive ya aplicado en `css/styles.css` para evitar desbordes horizontales en teléfonos. No se pudo tomar screenshot automático porque el contenedor no tiene navegador gráfico instalado.

Validación pendiente recomendada en dispositivo real:

- Android Chrome.
- iPhone Safari.
- Pantalla pequeña en modo responsive.

Rutas a revisar manualmente:

- Dashboard.
- Pronósticos.
- Especiales.
- Rankings.
- Administración.
- Login.
- Registro.

## Fase 4 — Revisión de textos

Correcciones realizadas:

- Administración usa “Usuarios de prueba” en lugar de “Usuarios dummy”.
- Tarjetas de ayuda usan “Estructura”, “Datos base” y “Limpieza” en lugar de términos en inglés.

Términos técnicos que se conservan por ser identificadores operativos o nombres de archivo:

- `ROOT`, `ADMIN`, `USER`.
- `PAID`, `UNPAID` cuando forman parte de enum/código SQL.
- `schema.sql`, `seed_worldcup_2026.sql`, rutas SQL y nombres de funciones.
- Nombres propios de proveedores futuros de API cuando aparecen como ejemplo.

## Fase 5 — Revisión de datos visibles

El seed oficial actual es `sql/seed_worldcup_2026.sql` y contiene nombres visibles en español para selecciones, estadios y ciudades cuando aplica.

Notas:

- Los códigos de equipos como `USA`, `MEX`, `CAN` se conservan como códigos técnicos.
- Nombres de jugadores se conservan en su forma original; no deben traducirse.
- Ciudades como Kansas City se conservan como nombre propio.

## Fase 6 — Validación del autocomplete

Revisión estática confirmada:

- El autocomplete usa `input` visible, `datalist` y un input oculto con el ID real.
- El guardado lee el ID oculto, no texto libre.
- Si el texto no corresponde a una opción existente, el ID queda vacío y la validación impide guardar.
- Aplica en Especiales del usuario y Resultados especiales de Administración.

Búsquedas recomendadas para validación manual con datos cargados:

- `mex` → México.
- `fran` → Francia.
- `ingla` → Inglaterra.
- `mbap` → Kylian Mbappé — Francia.
- `kane` → Harry Kane — Inglaterra.

## Fase 7 — Seed oficial

Para producción del Mundial 2026, usar:

1. `sql/seed_worldcup_2026.sql` para torneo, selecciones y partidos compatibles con el schema actual.
2. `sql/seed_worldcup_2026_players_candidates.sql` para candidatos a máximo goleador.
3. `sql/validate_worldcup_2026_seed.sql` para validar conteos y consistencia.

No usar `sql/seed_base_data.sql` en producción del Mundial si ya está cargado el seed oficial, porque contiene datos base/placeholder para pruebas o staging.

Orden recomendado en una base existente:

1. Migraciones pendientes aplicables.
2. `sql/seed_worldcup_2026.sql`.
3. `sql/seed_worldcup_2026_players_candidates.sql`.
4. `sql/validate_worldcup_2026_seed.sql`.
5. Validación manual en la app.

## Fase 8 — Limpieza documental

Se agregó este documento como fuente de cierre operativo para la revisión final. README queda como guía general del proyecto y este archivo como cierre específico de QA para Mundial 2026.

## Bugs encontrados

- Textos visibles en Administración con términos en inglés/no amigables: corregidos.

## Bugs no reproducidos en este entorno

- No se reprodujeron errores de premios/rankings en pruebas automatizadas locales.
- No se ejecutaron flujos reales contra Supabase productivo desde este entorno.

## Riesgos conocidos

- La validación completa de Auth real, pagos reales y recuperación de contraseña requiere ambiente Supabase con usuarios/sesiones de prueba controlados.
- La validación móvil visual final debe hacerse en dispositivos reales o navegador con herramientas responsive.
- La app sigue dependiendo de captura manual de resultados; la API automática queda en backlog.

## Backlog post Mundial — no implementar ahora

1. Mejor jugador del torneo (Balón de Oro).
2. Mejor portero del torneo.
3. Nuevos puntos especiales.
4. API automática de resultados.
5. API automática de especiales.
6. Ranking calculado en SQL/RPC.
7. Materialized Views.
8. Historial de cambios.
9. Auditoría.
10. Exportación Excel.
11. Estadísticas avanzadas.
12. Soporte multi-torneo completo.
13. CI/CD.
14. Suite amplia de pruebas automatizadas.
15. Refactor técnico futuro si el crecimiento lo justifica.

## Confirmación de no ruptura

Esta revisión no cambió:

- Auth.
- Rankings.
- Fórmula de premios.
- Pagos.
- Guardado de pronósticos.
- Guardado de especiales.
- Captura de resultados.
- Estructura de base de datos.
