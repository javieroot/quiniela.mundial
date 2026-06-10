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
