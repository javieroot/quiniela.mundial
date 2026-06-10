
## Ajustes visuales y localización

- Toda la UI de usuario debe mostrarse en español México.
- Los valores internos de base pueden seguir como `PAID`, `UNPAID`, `SCHEDULED` y `FINISHED`, pero el frontend los traduce visualmente a `PAGADO`, `NO PAGADO`, `Programado` y `Finalizado`.
- Los avatares son locales, genéricos, aleatorios pero persistentes: se calculan con el ID/usuario y no requieren Storage.
- El ranking resalta el top 3 con trofeo/medallas sin cambiar la lógica de desempates ni premios.

## Migración para metadata de partidos y preparación API

Si tu Supabase ya existe y fue creado antes de estos ajustes, ejecuta:

sql/migrations/20260610_match_metadata_and_api_flags.sql

Agrega de forma compatible:

- `matches.group_name`
- `matches.stadium`
- `matches.city`
- `settings.results_api_enabled`
- `settings.results_api_provider`
- `settings.results_api_base_url`
- `settings.special_results_api_enabled`
- `settings.special_results_api_provider`

La captura manual de resultados sigue activa como respaldo. Las banderas de API solo preparan estructura para conectar proveedores después.
