(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;

  function renderRules() {
    UI.shell(`<section class="card p-5">
      <h2 class="text-2xl font-black">Reglas y FAQ</h2>
      <div class="faq-grid mt-4">
        <article><h3>¿Cómo puntúan los partidos?</h3><p>Marcador exacto: <b>3 puntos</b>. Resultado correcto sin marcador exacto: <b>1 punto</b>. Incorrecto: <b>0 puntos</b>.</p></article>
        <article><h3>¿Cómo puntúan los especiales?</h3><p>Campeón: <b>5</b>. Subcampeón: <b>3</b>. Tercer lugar: <b>2</b>. Máximo goleador: <b>5</b>.</p></article>
        <article><h3>¿Cuándo se bloquean los partidos?</h3><p>Cada partido se bloquea <b>${P.lockMinutes()} minuto(s)</b> antes de iniciar, según configuración activa. Después del bloqueo no se puede modificar.</p></article>
        <article><h3>¿Cuándo se bloquean los especiales?</h3><p>Al iniciar el torneo. Los especiales bloqueados siguen visibles para el usuario.</p></article>
        <article><h3>¿Ranking general vs oficial?</h3><p>El general incluye a todos los registrados y simula premios como si todos hubieran pagado. El oficial incluye solo usuarios <b>PAID</b> y define premios reales.</p></article>
        <article><h3>¿Cómo se calculan premios?</h3><p>Bolsa = participantes × costo. Se resta comisión admin. La bolsa neta se reparte en 1°, 2° y 3°. Si hay empate en un lugar, ese premio se divide entre sus ganadores.</p></article>
        <article><h3>¿Cuáles son los desempates?</h3><p>Total, puntos especiales, exactos, resultados acertados y última modificación más antigua. <b>No</b> se usa orden alfabético.</p></article>
        <article><h3>¿Puedo ganar si no he pagado?</h3><p>Sales en ranking general, pero solo usuarios <b>PAID</b> participan en premios oficiales.</p></article>
      </div>
    </section>`);
  }

  window.PronostixRules = { renderRules };
}());
