(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;

  function renderRules() {
    UI.shell(`<section class="card p-5">
      <div class="section-title"><div><h2>Reglas</h2><p>Resumen claro para jugar y entender rankings/premios.</p></div></div>
      <div class="rules-list mt-4">
        <article><h3>Puntos por partido</h3><p>Marcador exacto: <b>3 puntos</b>. Resultado correcto sin marcador exacto: <b>1 punto</b>. Incorrecto: <b>0 puntos</b>.</p></article>
        <article><h3>Puntos especiales</h3><p>Campeón: <b>5</b>. Subcampeón: <b>3</b>. Tercer lugar: <b>2</b>. Máximo goleador: <b>5</b>.</p></article>
        <article><h3>Bloqueo de pronósticos</h3><p>Cada partido se bloquea <b>${P.lockMinutes()} minuto(s)</b> antes de iniciar. Después del bloqueo no se puede modificar.</p></article>
        <article><h3>Bloqueo de especiales</h3><p>Los especiales se bloquean al iniciar el torneo. Los especiales bloqueados siguen visibles.</p></article>
        <article><h3>Ranking general y oficial</h3><p>El general incluye a todos los registrados y simula premios como si todos hubieran pagado. El oficial incluye solo usuarios con estado <b>PAGADO</b> y define premios reales. En la tabla, <b>Pts partidos</b> son puntos acumulados por pronósticos de partidos, no cantidad de partidos jugados.</p></article>
        <article><h3>Desempates</h3><p>Orden: puntos totales, puntos especiales y última modificación más antigua. No se usa orden alfabético.</p></article>
      </div>
    </section>
    <section class="card p-5"><h2 class="text-2xl font-black">FAQ</h2>
      <div class="faq-grid mt-4">
        <article><h3>¿Puedo ganar si no he pagado?</h3><p>Puedes aparecer arriba en el ranking general, pero solo usuarios con estado <b>PAGADO</b> participan por premios oficiales.</p></article>
        <article><h3>¿Qué significan las columnas del ranking?</h3><p><b>Pts partidos</b> suma 3 por marcador exacto y 1 por resultado acertado. <b>Pts especiales</b> suma los especiales acertados. <b>Total pts</b> es la suma de ambos. <b>Marcadores exactos</b> es cantidad de partidos donde atinaste el marcador exacto y <b>Resultados acertados</b> es cantidad de partidos donde atinaste ganador/empate sin exacto.</p></article>
        <article><h3>¿Qué pasa si empato?</h3><p>Los empatados comparten posición. Si el empate es en zona de premio, el monto de ese lugar se reparte entre los ganadores empatados.</p></article>
        <article><h3>¿Puedo cambiar un pronóstico?</h3><p>Sí, mientras el partido no esté bloqueado. Una vez bloqueado, queda visible pero ya no editable.</p></article>
        <article><h3>¿Quién captura resultados?</h3><p>El admin captura resultados de partidos y especiales manualmente desde el panel de administración.</p></article>
        <article><h3>¿Qué pasa si falla la actualización automática?</h3><p>Por ahora no hay actualización automática implementada. La captura manual es la fuente principal; la API queda preparada para una fase futura.</p></article>
      </div>
    </section>`);
  }

  window.PronostixRules = { renderRules };
}());
