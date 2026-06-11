# Pronostix - entrega rápida de archivos

Esta es la lista corta para avanzar sin revisar todo el proyecto.

## 1. Archivos de la app

Sube estos archivos a GitHub Pages:

- `index.html`
- `config.js`
- `css/styles.css`
- carpeta completa `js/`

## 2. Archivos SQL para Supabase

Ejecuta en Supabase SQL Editor en este orden:

1. `sql/schema.sql` si la base es nueva.
2. `sql/migrations/20260610_match_metadata_and_api_flags.sql` si la base ya existía.
3. `sql/migrations/20260610_roles_and_admin_maintenance.sql` para ROOT/ADMIN y mantenimiento.
4. `sql/migrations/20260611_settings_distribution_90_10.sql` para corregir distribución 90/10.
5. `sql/seed_base_data.sql` para dejar inscripción 200 MXN, premios 50/25/15 y admin 10%.
6. `sql/seed_worldcup_2026.sql` para calendario/equipos.
7. `sql/seed_worldcup_2026_players_candidates.sql` para goleadores.
8. `sql/validate_worldcup_2026_seed.sql` para validar carga base.

## 3. Limpieza antes de producción

Si hubo datos de prueba:

1. Ejecuta `sql/cleanup_test_data.sql` para quitar usuarios dummy conocidos.
2. Entra como ADMIN/ROOT al panel y usa Mantenimiento:
   - Limpiar capturas de usuarios.
   - Limpiar resultados del torneo.
   - O Reiniciar prueba completa.
3. Ejecuta `sql/validate_pre_production_clean.sql`.
4. Todo debe salir `OK`. Si aparece `REVISAR`, corrige antes de liberar.

## 4. Checklist rápida

- ROOT puede entrar al panel.
- ADMIN puede operar pagos/resultados.
- General muestra todos los usuarios.
- Oficial muestra solo PAGADO.
- Especiales no permiten repetir equipos.
- Premios: 50%, 25%, 15% del total; admin: 10%.
- Admin: 10% no visible para usuario.
- Inscripción: 200 MXN.
- Bloqueo: 1 minuto antes del partido.
- Todo visible en español.

## 5. Si solo quieres probar ya

1. Configura `config.js` con URL y anon key de Supabase.
2. Abre `index.html` en GitHub Pages.
3. Crea/usa usuario ROOT.
4. Revisa el panel de Administración.
5. Ejecuta `validate_pre_production_clean.sql` antes de producción.

## 6. Flujo operativo de liberación 10:00

1. Abrir la app publicada y entrar como ROOT/ADMIN.
2. En Administración revisar **Estado del sistema**:
   - usuarios registrados y pagados esperados,
   - usuarios dummy en 0,
   - partidos y jugadores cargados,
   - capturas/resultados en 0 si todavía no inicia producción.
3. Confirmar configuración:
   - inscripción 200 MXN,
   - comisión admin 10% visible solo en Administración,
   - premios visibles 1° 50%, 2° 25%, 3° 15%.
4. Ejecutar validaciones SQL finales:
   - `sql/validate_worldcup_2026_seed.sql`,
   - `sql/validate_pre_production_clean.sql`.
5. Si aparece `REVISAR`, corregir y repetir validación antes de liberar.

## 7. Recuperación rápida

- Si hay usuarios dummy: ejecutar `sql/cleanup_test_data.sql`.
- Si hay capturas de usuario de prueba: ejecutar `reset_user_entries()` o usar el botón **Limpiar capturas de usuarios**.
- Si hay resultados de prueba: ejecutar `reset_tournament_results()` o usar **Limpiar resultados del torneo**.
- Si hay capturas y resultados de prueba: ejecutar `reset_full_test()` o usar **Reiniciar prueba completa**.
- Si Administración muestra “No se pudo verificar”, revisar sesión ADMIN/ROOT, RLS y migración `sql/migrations/20260610_roles_and_admin_maintenance.sql`.
