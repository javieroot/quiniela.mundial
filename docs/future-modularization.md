# Estado de modularización

La modularización principal ya está aplicada.

## Estado actual

- `js/core.js`: configuración, cliente Supabase único, estado global y helpers.
- `js/data.js`: consultas Supabase compartidas.
- `js/ui.js`: shell, navegación y helpers visuales.
- `js/auth.js`: registro, login, logout y recuperación.
- `js/dashboard.js`: inicio.
- `js/predictions.js`: pronósticos por partido.
- `js/specials.js`: pronósticos especiales.
- `js/rankings.js`: rankings, puntos y premios.
- `js/rules.js`: reglas y FAQ.
- `js/admin.js`: panel administrador.
- `js/app.js`: bootstrap/router.

## Pendiente futuro

No hacer refactor grande antes de liberar. Si crece el proyecto, evaluar build con Vite o módulos ES, pero mantener compatibilidad GitHub Pages.
