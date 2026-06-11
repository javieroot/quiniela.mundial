# QA final pre-producción

## Objetivo

Dejar Pronostix estable para liberar alrededor de las 10:00, sin refactors grandes y sin tocar ranking, auth base, RLS funcional ni seeds del Mundial salvo que una corrección lo requiera.

## Orden SQL recomendado

1. `sql/schema.sql` solo en base nueva.
2. `sql/migrations/20260610_match_metadata_and_api_flags.sql` si la base ya existía y faltan metadata/flags.
3. `sql/migrations/20260610_roles_and_admin_maintenance.sql` para roles ROOT/ADMIN y mantenimiento.
4. `sql/migrations/20260611_settings_distribution_90_10.sql` para inscripción 200 MXN, admin 10%, premios 50/25/15.
5. `sql/seed_worldcup_2026.sql`.
6. `sql/seed_worldcup_2026_players_candidates.sql`.
7. `sql/validate_worldcup_2026_seed.sql`.
8. `sql/cleanup_test_data.sql` si hubo usuarios dummy conocidos.
9. `reset_user_entries()`, `reset_tournament_results()` o `reset_full_test()` según el tipo de prueba a limpiar.
10. `sql/validate_pre_production_clean.sql`.

## Limpieza pre-producción

- `cleanup_test_data.sql`: borra usuarios dummy conocidos y sus datos asociados; conserva admin ROOT, javieroot ADMIN, equipos, jugadores, partidos, torneo y settings.
- `reset_user_entries()`: borra pronósticos y especiales capturados por usuarios; conserva resultados, usuarios, pagos, roles, torneo, settings, equipos, calendario y jugadores.
- `reset_tournament_results()`: borra resultados especiales y limpia marcadores/estado de partidos; conserva capturas de usuarios, usuarios, pagos, roles, torneo, settings, equipos, calendario y jugadores.
- `reset_full_test()`: borra capturas y resultados de prueba; conserva usuarios reales, admin ROOT, javieroot ADMIN, pagos, roles, torneo, settings, equipos, calendario y jugadores.

## Checklist manual

### Smoke test

- Abrir aplicación publicada.
- Login/logout.
- Navegar Dashboard, Pronósticos, Especiales, Ranking general, Ranking oficial, Reglas y Administración.
- Confirmar que no hay errores en consola.

### Administración

- Estado del sistema carga sin error 400.
- Si una consulta falla, se muestra “No se pudo verificar” y el panel sigue usable.
- Secciones colapsables funcionan: Estado, Configuración, Usuarios, Resultados, Especiales, Mantenimiento, Ayuda.
- Menú rápido lleva a cada sección.
- Guardar configuración está visible arriba y dentro de la sección.

### Pronósticos

- Guardar individual con marcador completo funciona.
- Guardar individual incompleto falla con mensaje.
- Guardar todo ignora partidos vacíos o bloqueados.
- Guardar todo falla si hay un partido incompleto.
- Guardar todo usa upsert y actualiza `updated_at`.

### Especiales

- Guardar incompleto falla.
- Repetir equipo en podio falla.
- Guardar completo funciona.

### Auth

- Login, registro, recuperación y nueva contraseña mantienen Supabase Auth.
- Botones Mostrar/Ocultar funcionan en contraseña, nueva contraseña y confirmación.

### Ranking y premios

- Ranking general incluye todos los usuarios.
- Ranking oficial incluye solo usuarios PAGADO.
- Desempates: puntos totales, puntos especiales, última modificación más antigua.
- Premios visibles: 1° 50%, 2° 25%, 3° 15%.
- Comisión admin 10% visible solo en Administración.

## Recuperación ante errores comunes

- Error 400 en Administración sobre `special_results?select=id`: `special_results` no tiene columna `id`; usar conteo HEAD con `select("*", { count: "exact", head: true })` y filtrar por `tournament_id`.
- “No se pudo verificar”: revisar sesión ADMIN/ROOT, RLS, migraciones aplicadas y políticas de lectura.
- No aparecen roles o resets: ejecutar migración `20260610_roles_and_admin_maintenance.sql`.
- Configuración económica incorrecta: ejecutar `20260611_settings_distribution_90_10.sql` y validar con `validate_pre_production_clean.sql`.
