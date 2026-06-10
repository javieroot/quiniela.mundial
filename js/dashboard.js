(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;

  function renderDashboard() {
    const paid = P.state.profile?.payment_status === "PAID";
    UI.shell(`<section class="hero card"><div><p class="eyebrow">Torneo activo</p><h2>${P.esc(P.state.activeTournament?.name || "Sin torneo activo")}</h2><p>Captura tus marcadores, especiales y presume el ranking con premios integrados.</p></div><div class="hero-actions"><button class="btn btn-primary" onclick="PronostixApp.go('predictions')">Pronosticar partidos</button><button class="btn btn-secondary" onclick="PronostixApp.go('specials')">Especiales</button></div></section>
    <section class="grid md:grid-cols-4 gap-4">
      <div class="card stat"><span>Estado pago</span><b>${paid ? "PAGADO" : "NO PAGADO"}</b><small>${paid ? "Participas en ranking oficial." : "Apareces en general; paga para premios oficiales."}</small></div>
      <div class="card stat"><span>Inscripción</span><b>${P.money(P.state.settings?.entry_fee)}</b><small>Costo configurado por admin.</small></div>
      <div class="card stat"><span>Bloqueo</span><b>${P.lockMinutes()} min</b><small>Antes de cada partido.</small></div>
      <div class="card stat"><span>Desempates</span><b>Sin alfabético</b><small>Total, especiales, exactos, resultados, última mod.</small></div>
    </section>
    <section class="card p-5"><h3 class="text-xl font-black">Checklist para ganar</h3><ol class="list-decimal ml-5 mt-2 text-slate-700 space-y-1"><li>Guarda marcador local/visitante antes del bloqueo.</li><li>Llena campeón, subcampeón, tercer lugar y goleador.</li><li>Revisa ranking general para presumir y ranking oficial para premios reales.</li><li>Confirma con el admin que tu estado sea PAGADO.</li></ol></section>`);
  }

  window.PronostixDashboard = { renderDashboard };
}());
