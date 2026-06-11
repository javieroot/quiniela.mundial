# Pronostix v2

Pronostix v2 es una app estática para GitHub Pages con Supabase Auth, Supabase JS v2 y RLS. No usa backend externo ni `SUPABASE_SERVICE_ROLE_KEY` en frontend.

## Estructura

```text
index.html
config.js
config.example.js
css/styles.css
js/core.js
js/data.js
js/ui.js
js/auth.js
js/dashboard.js
js/predictions.js
js/specials.js
js/rankings.js
js/rules.js
js/admin.js
js/app.js
sql/schema.sql
sql/seed_base_data.sql
sql/migrations/20260610_match_metadata_and_api_flags.sql
sql/cleanup_test_data.sql
```

## Instalación rápida

1. Crear proyecto Supabase nuevo.
2. Ejecutar `sql/schema.sql` para estructura limpia.
3. Ejecutar `sql/seed_base_data.sql` para datos base editables de producción/staging.
4. Copiar `config.example.js` a `config.js` y llenar `supabaseUrl`, `supabaseAnonKey` y `siteUrl`.
5. Publicar raíz del repo en GitHub Pages.

## Configuración frontend

`config.js` debe exponer solo datos públicos:

```js
window.PRONOSTIX_CONFIG = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "TU_ANON_KEY_PUBLICA",
  platformName: "Pronostix",
  siteUrl: "https://javieroot.github.io/quiniela.mundial/"
};
```

Nunca poner `service_role` en frontend.

## Supabase Auth

En Authentication > URL Configuration:

- Site URL: `https://javieroot.github.io/quiniela.mundial/`
- Redirect URLs: agregar producción y local si pruebas con `python3 -m http.server 8081`.

## Base de datos

### `schema.sql`

Solo estructura limpia: tablas, relaciones, constraints, índices, RLS, policies, funciones y triggers.

### `seed_base_data.sql`

Datos base de producción/staging:

- settings iniciales
- torneo
- equipos placeholder
- partidos placeholder con grupo/fase, estadio y ciudad
- jugadores candidatos placeholder

No inventa calendario oficial completo. Antes de producción real hay que reemplazar placeholders con datos confirmados.

### Migración para bases existentes

Si tu base fue creada antes de metadata/API flags, ejecuta:

```sql
sql/migrations/20260610_match_metadata_and_api_flags.sql
```

Agrega:

- `matches.group_name`
- `matches.stadium`
- `matches.city`
- flags futuros de API en `settings`

### `cleanup_test_data.sql`

Limpia usuarios dummy conocidos, sus pronósticos/especiales y auditoría asociada, pero conserva estructura, settings, torneo, equipos, jugadores y partidos base. Los resultados de prueba se limpian con las RPC de mantenimiento (`reset_tournament_results()` o `reset_full_test()`).

### `validate_pre_production_clean.sql`

Verifica antes de liberar que no queden usuarios dummy conocidos, capturas, resultados de prueba ni configuración económica distinta a 200 MXN, 10% admin y premios 50%/25%/15%.

## Operación del torneo

1. Admin configura torneo activo, inscripción, porcentajes y minutos de bloqueo.
2. Usuarios se registran y capturan pronósticos de partidos.
3. Usuarios capturan especiales: campeón, subcampeón, tercer lugar y goleador.
4. Admin confirma pagos con estado `PAGADO`.
5. Admin captura resultados de partidos y especiales manualmente.
6. Rankings muestran general y oficial.

## Rankings y premios

- Ranking general: incluye todos los usuarios y simula premios como si todos hubieran pagado.
- Ranking oficial: incluye solo usuarios con estado `PAGADO`.
- Desempates: puntos totales, puntos especiales y última modificación más antigua.
- No hay desempate alfabético; los empates comparten posición densa y premio.

## Estado de API automática

La API automática NO está implementada. Por ahora:

- captura manual de resultados es la fuente principal
- existen flags de preparación en `settings`
- el panel admin muestra “Preparación para API futura”
- el botón de sincronización debe permanecer como “próximamente”

## GitHub Pages

Configurar:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/root`

Si ves versión vieja, cambia query strings en `index.html` y abre en incógnito.

## Checklist pre-producción

- Verificar login/logout/recuperación de contraseña.
- Verificar que no exista `service_role` en frontend.
- Verificar que `js/app.js` exponga `window.PronostixApp`.
- Verificar que `data.js` solo consulte columnas existentes de `teams` (`id`, `name`, `code`).
- Verificar que `matches` tenga `group_name`, `stadium`, `city`.
- Confirmar configuración: inscripción 200 MXN, admin 10%, premios 50%/25%/15% y bloqueo 1 minuto antes del partido.
- Ejecutar `cleanup_test_data.sql` si existieron usuarios dummy conocidos.
- Ejecutar `validate_pre_production_clean.sql` y resolver cualquier fila en `REVISAR`.
- Probar dashboard, pronósticos, especiales, ranking general, ranking oficial y admin.

## Riesgos pendientes

- Carga real de calendario/equipos depende de datos oficiales confirmados.
- API automática de resultados sigue pendiente.
- No hay suite automatizada de pruebas; QA es manual por ahora.

## Flujo de liberación recomendado (QA final)

1. Publicar los archivos estáticos y confirmar que `config.js` apunta al proyecto Supabase correcto.
2. En Supabase SQL Editor ejecutar, según aplique, migraciones y seeds en este orden:
   1. `sql/schema.sql` solo si la base es nueva.
   2. `sql/migrations/20260610_match_metadata_and_api_flags.sql` si faltan metadata de partidos o flags de API futura.
   3. `sql/migrations/20260610_roles_and_admin_maintenance.sql` para ROOT/ADMIN y mantenimiento.
   4. `sql/migrations/20260611_settings_distribution_90_10.sql` para inscripción 200 MXN, admin 10%, premios 50/25/15.
   5. `sql/seed_worldcup_2026.sql`.
   6. `sql/seed_worldcup_2026_players_candidates.sql`.
   7. `sql/validate_worldcup_2026_seed.sql`.
3. Si hubo pruebas, limpiar antes de producción:
   1. `sql/cleanup_test_data.sql` para usuarios dummy conocidos.
   2. `reset_user_entries()` si solo quieres borrar capturas de usuarios.
   3. `reset_tournament_results()` si solo quieres borrar resultados de partidos/especiales.
   4. `reset_full_test()` si quieres borrar capturas y resultados de prueba.
   5. `sql/validate_pre_production_clean.sql` como verificación final.
4. Validar manualmente login, registro, recuperación, pronósticos, especiales, ranking general/oficial y Administración.

### Qué conserva la limpieza pre-producción

- `cleanup_test_data.sql` borra únicamente usuarios dummy conocidos y datos asociados a esos usuarios; conserva admin ROOT, javieroot ADMIN, equipos, jugadores, partidos, torneo y settings.
- `reset_user_entries()` conserva resultados del torneo, usuarios, pagos, roles, equipos, jugadores, partidos, torneo y settings.
- `reset_tournament_results()` conserva pronósticos, especiales de usuarios, usuarios, pagos, roles, equipos, jugadores, partidos como calendario, torneo y settings.
- `reset_full_test()` conserva usuarios reales, admin ROOT, javieroot ADMIN, pagos, roles, equipos, jugadores, partidos como calendario, torneo y settings; borra capturas y resultados de prueba.

### Recuperación ante errores comunes

- Error 400 en conteos de Administración: verificar que las consultas de conteo usen `select("*", { count: "exact", head: true })`; `special_results` no tiene columna `id`, su llave primaria es `tournament_id`.
- Administración muestra “No se pudo verificar”: revisar sesión ADMIN/ROOT, políticas RLS y que las migraciones de mantenimiento estén aplicadas.
- Falta metadata de partidos o flags de API futura: ejecutar `sql/migrations/20260610_match_metadata_and_api_flags.sql`.
- No aparecen acciones de roles: confirmar usuario ROOT y ejecutar `sql/migrations/20260610_roles_and_admin_maintenance.sql`.
