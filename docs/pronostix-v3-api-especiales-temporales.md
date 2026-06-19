# Pronostix V3 — API de resultados y especiales temporales

## Alcance implementado

Esta entrega agrega una integración temporal y reversible para operar resultados desde un proveedor externo sin eliminar la captura manual:

- Sincronización manual desde Administración usando un proveedor real: `thesportsdb`.
- Soporte avanzado para URL JSON propia, pero ya no es obligatorio para operar.
- Para TheSportsDB, Pronostix descarga eventos pasados de una liga y empata resultados por equipos + fecha; si no hay empate seguro, omite el partido para revisión manual.
- Bitácora en `api_sync_logs` para intentos desde API y overrides manuales.
- Dos especiales temporales nuevos:
  - Mejor jugador del torneo.
  - Mejor portero del torneo.
- Puntuación temporal:
  - Campeón: 5.
  - Subcampeón: 3.
  - Tercer lugar: 2.
  - Máximo goleador: 5.
  - Mejor jugador: 5.
  - Mejor portero: 5.

## Migración requerida

Ejecutar en Supabase SQL Editor:

Archivo:

sql/migrations/20260618_api_results_and_temporary_specials.sql

La migración es compatible con producción porque solo agrega columnas `nullable`, columnas de settings si faltan y una tabla nueva de bitácora.

## Proveedor recomendado sin registro

Proveedor: `thesportsdb`

Campo `Liga/endpoint del proveedor`: capturar el `idLeague` de TheSportsDB. Pronostix construye automáticamente la URL:

https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=ID_LEAGUE

La captura manual queda como respaldo para partidos que el proveedor no entregue o que no empaten con seguridad.

## Formato JSON avanzado para resultados

Ejemplo:

{
  "matches": [
    {
      "match_id": "uuid-del-partido-en-pronostix",
      "home_score": 2,
      "away_score": 1,
      "status": "FINISHED"
    }
  ]
}

También se acepta un arreglo directo con la misma estructura. Los estados válidos son `FINISHED` y `SCHEDULED`; cualquier otro valor se normaliza a `FINISHED`.

## Operación recomendada

1. Ejecutar migración SQL.
2. Publicar frontend actualizado.
3. Entrar a Administración → Configuración del torneo → Sincronización de resultados desde proveedor.
4. Guardar proveedor `thesportsdb` y el `idLeague` correspondiente.
5. Ejecutar `Sincronizar resultados desde API`.
6. Revisar resumen de actualizados/omitidos.
7. Corregir manualmente cualquier partido omitido.

## Qué sigue

- Confirmar el `idLeague` exacto del Mundial 2026 en TheSportsDB cuando el torneo esté publicado completo.
- Agregar mapeo controlado `api_match_id` por partido si el proveedor no empata bien por equipos + fecha.
- Mover el cálculo de ranking a SQL/RPC antes de escalar a múltiples torneos activos.
- Ampliar auditoría por campo para pagos, resultados, especiales y configuración.
