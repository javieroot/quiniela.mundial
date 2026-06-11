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
4. `sql/seed_base_data.sql` para dejar inscripción 200 MXN, premios 50/25/15 y admin 10%.
5. `sql/seed_worldcup_2026.sql` para calendario/equipos.
6. `sql/seed_worldcup_2026_players_candidates.sql` para goleadores.
7. `sql/validate_worldcup_2026_seed.sql` para validar carga base.

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
- Premios: 50%, 25%, 15%.
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
