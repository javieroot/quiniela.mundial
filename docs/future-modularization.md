# Propuesta futura de modularización

No se recomienda hacer un refactor grande antes de producción. La app debe salir estable primero.

## Objetivo

Separar `js/app.js` en módulos pequeños sin cambiar comportamiento.

## Orden sugerido

1. `js/core/config.js`
   - lectura de `window.PRONOSTIX_CONFIG`
   - validación de `supabaseUrl`, `supabaseAnonKey`, `siteUrl`

2. `js/core/supabase.js`
   - creación del cliente Supabase
   - helpers de sesión

3. `js/core/state.js`
   - estado global
   - carga inicial de usuario, perfil, torneos, settings

4. `js/features/auth.js`
   - login
   - registro
   - recuperación
   - cambio de contraseña post-redirect

5. `js/features/predictions.js`
   - render de partidos
   - guardado de pronósticos
   - bloqueo visible

6. `js/features/specials.js`
   - especiales
   - validación de no repetir campeón/subcampeón/tercer lugar

7. `js/features/rankings.js`
   - cálculo de puntos
   - ranking denso
   - desempates
   - premios

8. `js/features/admin.js`
   - pagos
   - resultados
   - settings
   - resumen de bolsa

9. `js/ui/components.js`
   - botones
   - tablas
   - cards
   - toast

## Reglas para cuando se haga

- No cambiar SQL.
- No cambiar nombres de columnas.
- No cambiar reglas de negocio.
- Refactor en commits pequeños.
- Después de mover cada módulo, probar login, ranking, admin y predicciones.
