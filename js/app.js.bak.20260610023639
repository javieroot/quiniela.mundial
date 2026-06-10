const cfg = window.PRONOSTIX_CONFIG || {};
const app = document.getElementById("app");
const sb = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

let session = null;
let profile = null;
let base = { tournament:null, settings:null };

const $ = id => document.getElementById(id);
const val = id => $(id)?.value?.trim();
const money = n => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(Number(n||0));
const dt = v => v ? new Date(v).toLocaleString("es-MX",{dateStyle:"medium",timeStyle:"short"}) : "";
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const toast = (m) => alert(m);

async function init(){
  if(!cfg.supabaseUrl || !cfg.supabaseAnonKey || cfg.supabaseUrl.includes("TU-PROYECTO")){
    app.innerHTML = `<main class="max-w-xl mx-auto p-6"><div class="card p-6"><h1 class="text-3xl font-black">Pronostix v2</h1><p class="mt-3">Copia <code>config.example.js</code> a <code>config.js</code> y pega Supabase URL + anon key.</p></div></main>`;
    return;
  }
  const {data} = await sb.auth.getSession();
  session = data.session;
  sb.auth.onAuthStateChange(async (_e,s)=>{session=s; await loadProfile(); await loadBase(); render();});
  await loadProfile(); await loadBase(); render();
}

async function loadProfile(){
  profile = null;
  if(!session?.user) return;
  const {data,error} = await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
  if(error) toast(error.message); else profile=data;
}

async function loadBase(){
  if(!session) return;
  const [{data:t},{data:s}] = await Promise.all([
    sb.from("tournaments").select("*").eq("is_active",true).maybeSingle(),
    sb.from("settings").select("*").eq("id",1).single()
  ]);
  base.tournament=t; base.settings=s;
}

function auth(mode="login"){
  const reg = mode==="register", reset = mode==="reset";
  app.innerHTML = `<main class="max-w-md mx-auto p-6"><section class="card p-6 mt-10">
  <h1 class="text-3xl font-black text-blue-700">Pronostix v2</h1>
  <div class="space-y-3 mt-5">
  ${reg ? `
    <input id="email" class="input" placeholder="Email">
    <input id="username" class="input" placeholder="Username único">
    <input id="display" class="input" placeholder="Nombre visible">
    <input id="password" class="input" type="password" placeholder="Contraseña">
    <button class="btn btn-primary w-full" onclick="register()">Crear cuenta</button>
    <button class="btn btn-secondary w-full" onclick="auth()">Ya tengo cuenta</button>
  ` : reset ? `
    <input id="email" class="input" placeholder="Email">
    <button class="btn btn-primary w-full" onclick="resetPassword()">Recuperar</button>
    <button class="btn btn-secondary w-full" onclick="auth()">Volver</button>
  ` : `
    <input id="email" class="input" placeholder="Email">
    <input id="password" class="input" type="password" placeholder="Contraseña">
    <button class="btn btn-primary w-full" onclick="login()">Entrar</button>
    <button class="btn btn-secondary w-full" onclick="auth('register')">Registrarme</button>
    <button class="text-blue-700 font-bold" onclick="auth('reset')">Olvidé mi contraseña</button>
  `}
  </div></section></main>`;
}

async function register(){
  const {error}=await sb.auth.signUp({
    email:val("email"),
    password:val("password"),
    options:{data:{username:val("username"),display_name:val("display")},emailRedirectTo:location.href}
  });
  toast(error ? error.message : "Cuenta creada. Revisa tu email si Supabase pide confirmación.");
}
async function login(){
  const {error}=await sb.auth.signInWithPassword({email:val("email"),password:val("password")});
  if(error) toast(error.message);
}
async function logout(){ await sb.auth.signOut(); }
async function resetPassword(){
  const {error}=await sb.auth.resetPasswordForEmail(val("email"),{redirectTo:location.href});
  toast(error ? error.message : "Email enviado.");
}

function shell(content){
  const admin = profile?.is_admin ? `<button onclick="go('admin')" class="btn btn-secondary">Admin</button>` : "";
  app.innerHTML = `<header class="bg-white border-b sticky top-0 z-10"><div class="max-w-7xl mx-auto p-4 flex gap-2 flex-wrap items-center justify-between">
    <div><h1 class="text-2xl font-black text-blue-700">${esc(cfg.platformName||"Pronostix v2")}</h1><p class="text-sm">@${esc(profile?.username)} · ${profile?.payment_status==="PAID"?'<span class="badge paid">PAID</span>':'<span class="badge unpaid">NO PAGADO</span>'}</p></div>
    <nav class="flex gap-2 flex-wrap">
      <button onclick="go('home')" class="btn btn-secondary">Inicio</button>
      <button onclick="go('predictions')" class="btn btn-secondary">Pronósticos</button>
      <button onclick="go('specials')" class="btn btn-secondary">Especiales</button>
      <button onclick="go('general')" class="btn btn-secondary">General</button>
      <button onclick="go('official')" class="btn btn-secondary">Oficial</button>
      <button onclick="go('rules')" class="btn btn-secondary">Reglas</button>
      ${admin}
      <button onclick="logout()" class="btn btn-secondary">Salir</button>
    </nav>
  </div></header><main class="max-w-7xl mx-auto p-4 space-y-4">${content}</main>`;
}

window.go = async view => {
  await loadBase();
  if(view==="predictions") return predictions();
  if(view==="specials") return specials();
  if(view==="general") return ranking(false);
  if(view==="official") return ranking(true);
  if(view==="rules") return rules();
  if(view==="admin") return admin();
  home();
};

function home(){
  shell(`<section class="grid md:grid-cols-3 gap-4">
    <div class="card p-5"><b>Torneo</b><p>${esc(base.tournament?.name||"Sin torneo")}</p></div>
    <div class="card p-5"><b>Bloqueo</b><p>${base.settings?.lock_minutes_before_match??1} min antes</p></div>
    <div class="card p-5"><b>Inscripción</b><p>${money(base.settings?.entry_fee)}</p></div>
  </section>`);
}

async function data(){
  const tid=base.tournament?.id;
  const [teams,players,matches]=await Promise.all([
    sb.from("teams").select("*").eq("tournament_id",tid).order("name"),
    sb.from("players").select("*").eq("tournament_id",tid).order("name"),
    sb.from("matches").select("*,home:teams!matches_home_team_id_fkey(name),away:teams!matches_away_team_id_fkey(name)").eq("tournament_id",tid).order("kickoff_at")
  ]);
  return {teams:teams.data||[],players:players.data||[],matches:matches.data||[]};
}
const locked=m=>Date.now()>=new Date(m.kickoff_at).getTime()-((base.settings?.lock_minutes_before_match??1)*60000);

async function predictions(){
  const {matches}=await data();
  const {data:preds}=await sb.from("predictions").select("*").eq("user_id",session.user.id);
  const by=Object.fromEntries((preds||[]).map(p=>[p.match_id,p]));
  shell(`<section class="card p-5"><h2 class="text-2xl font-black">Pronósticos</h2><div class="space-y-3 mt-4">
  ${matches.map(m=>{const p=by[m.id]||{}, l=locked(m); return `<div class="border rounded-xl p-3 flex flex-wrap gap-3 justify-between items-center">
    <div><b>${esc(m.home?.name)} vs ${esc(m.away?.name)}</b><p class="text-sm text-slate-500">${dt(m.kickoff_at)} · ${l?"🔒 Bloqueado":"🟢 Abierto"}</p>${m.status==="FINISHED"?`<p>Resultado: ${m.home_score}-${m.away_score}</p>`:""}</div>
    <div class="flex gap-2 items-center"><input id="h-${m.id}" class="input w-20" type="number" min="0" value="${p.home_score??""}" ${l?"disabled":""}><span>-</span><input id="a-${m.id}" class="input w-20" type="number" min="0" value="${p.away_score??""}" ${l?"disabled":""}><button class="btn btn-primary" onclick="savePrediction('${m.id}')" ${l?"disabled":""}>Guardar</button></div>
  </div>`}).join("")}</div></section>`);
}
async function savePrediction(id){
  const {error}=await sb.from("predictions").upsert({user_id:session.user.id,match_id:id,home_score:Number(val("h-"+id)),away_score:Number(val("a-"+id))},{onConflict:"user_id,match_id"});
  toast(error?error.message:"Guardado");
}

async function specials(){
  const {teams,players,matches}=await data();
  const {data:sp}=await sb.from("special_predictions").select("*").eq("user_id",session.user.id).eq("tournament_id",base.tournament.id).maybeSingle();
  const first=matches[0]?.kickoff_at || base.tournament?.starts_at;
  const l=Date.now()>=new Date(first).getTime();
  const opts=(arr,sel)=>`<option value="">Selecciona</option>${arr.map(x=>`<option value="${x.id}" ${x.id===sel?"selected":""}>${esc(x.name)}</option>`).join("")}`;
  shell(`<section class="card p-5"><h2 class="text-2xl font-black">Especiales</h2><p>${l?"🔒 Bloqueados pero visibles":"🟢 Abiertos"}</p>
  <div class="grid md:grid-cols-2 gap-3 mt-4">
    <label>Campeón<select id="champion" class="input" ${l?"disabled":""}>${opts(teams,sp?.champion_team_id)}</select></label>
    <label>Subcampeón<select id="runner" class="input" ${l?"disabled":""}>${opts(teams,sp?.runner_up_team_id)}</select></label>
    <label>Tercer lugar<select id="third" class="input" ${l?"disabled":""}>${opts(teams,sp?.third_place_team_id)}</select></label>
    <label>Goleador<select id="scorer" class="input" ${l?"disabled":""}>${opts(players,sp?.top_scorer_player_id)}</select></label>
  </div><button class="btn btn-primary mt-4" onclick="saveSpecials()" ${l?"disabled":""}>Guardar</button></section>`);
}
async function saveSpecials(){
  const t=[val("champion"),val("runner"),val("third")].filter(Boolean);
  if(new Set(t).size!==t.length) return toast("No repitas equipos.");
  const payload={user_id:session.user.id,tournament_id:base.tournament.id,champion_team_id:val("champion")||null,runner_up_team_id:val("runner")||null,third_place_team_id:val("third")||null,top_scorer_player_id:val("scorer")||null};
  const {error}=await sb.from("special_predictions").upsert(payload,{onConflict:"user_id,tournament_id"});
  toast(error?error.message:"Especiales guardados");
}

function mp(p,m){
  if(m.status!=="FINISHED"||p.home_score==null||p.away_score==null) return {pts:0,ex:0,res:0};
  if(p.home_score===m.home_score&&p.away_score===m.away_score) return {pts:3,ex:1,res:0};
  if(Math.sign(p.home_score-p.away_score)===Math.sign(m.home_score-m.away_score)) return {pts:1,ex:0,res:1};
  return {pts:0,ex:0,res:0};
}
async function rows(official){
  const tid=base.tournament.id;
  const [u,m,p,sp,sr]=await Promise.all([
    sb.from("profiles").select("id,username,display_name,payment_status"),
    sb.from("matches").select("*").eq("tournament_id",tid),
    sb.from("predictions").select("*"),
    sb.from("special_predictions").select("*").eq("tournament_id",tid),
    sb.from("special_results").select("*").eq("tournament_id",tid).maybeSingle()
  ]);
  const r=(u.data||[]).filter(x=>!official||x.payment_status==="PAID").map(x=>({...x,match_points:0,special_points:0,total:0,exacts:0,results:0,last:"9999-12-31T00:00:00Z"}));
  const map=Object.fromEntries(r.map(x=>[x.id,x])), mm=Object.fromEntries((m.data||[]).map(x=>[x.id,x]));
  (p.data||[]).forEach(x=>{let row=map[x.user_id], ma=mm[x.match_id]; if(!row||!ma)return; let y=mp(x,ma); row.match_points+=y.pts; row.exacts+=y.ex; row.results+=y.res; if(x.updated_at<row.last) row.last=x.updated_at;});
  (sp.data||[]).forEach(x=>{let row=map[x.user_id], y=sr.data; if(!row||!y)return; row.special_points+=(x.champion_team_id===y.champion_team_id?5:0)+(x.runner_up_team_id===y.runner_up_team_id?3:0)+(x.third_place_team_id===y.third_place_team_id?2:0)+(x.top_scorer_player_id===y.top_scorer_player_id?5:0); if(x.updated_at<row.last) row.last=x.updated_at;});
  r.forEach(x=>x.total=x.match_points+x.special_points);
  r.sort((a,b)=>(b.total-a.total)||(b.special_points-a.special_points)||(b.exacts-a.exacts)||(b.results-a.results)||(new Date(a.last)-new Date(b.last)));
  let pos=0,prev=null; r.forEach((x,i)=>{if(!prev||x.total!==prev.total||x.special_points!==prev.special_points||x.exacts!==prev.exacts||x.results!==prev.results||x.last!==prev.last)pos=i+1; x.position=pos; prev=x;});
  return r;
}
async function ranking(official){
  const r=await rows(official);
  const n=official?r.length:r.length;
  const pool=n*Number(base.settings.entry_fee||0), net=pool*(1-Number(base.settings.admin_percentage||0)/100);
  shell(`<section class="card p-5"><h2 class="text-2xl font-black">Ranking ${official?"oficial":"general"}</h2><p>Bolsa: ${money(pool)} · Neta: ${money(net)}</p>
  <div class="table mt-4"><table class="w-full"><thead><tr><th>Pos</th><th>Usuario</th><th>Partidos</th><th>Especiales</th><th>Total</th><th>Exactos</th><th>Resultados</th><th>Pago</th></tr></thead><tbody>
  ${r.map(x=>`<tr><td><b>${x.position}</b></td><td>${esc(x.display_name)} @${esc(x.username)}</td><td>${x.match_points}</td><td>${x.special_points}</td><td><b>${x.total}</b></td><td>${x.exacts}</td><td>${x.results}</td><td>${x.payment_status}</td></tr>`).join("")}
  </tbody></table></div></section>`);
}

function rules(){
  shell(`<section class="card p-5"><h2 class="text-2xl font-black">Reglas</h2><ul class="list-disc ml-5 mt-3">
  <li>Exacto: 3 puntos. Resultado correcto: 1. Incorrecto: 0.</li>
  <li>Especiales: campeón 5, subcampeón 3, tercero 2, goleador 5.</li>
  <li>Partidos bloquean ${base.settings?.lock_minutes_before_match??1} min antes.</li>
  <li>Especiales bloquean al iniciar torneo.</li>
  <li>General incluye todos; oficial solo PAID.</li>
  <li>Desempates: total, especiales, exactos, resultados, modificación más antigua.</li>
  </ul></section>`);
}

async function admin(){
  if(!profile?.is_admin) return shell(`<div class="card p-5">No autorizado</div>`);
  const [{data:users},{matches,teams,players}]=await Promise.all([sb.from("profiles").select("*").order("created_at"),data()]);
  const {data:sr}=await sb.from("special_results").select("*").eq("tournament_id",base.tournament.id).maybeSingle();
  const opts=(arr,sel)=>`<option value="">Pendiente</option>${arr.map(x=>`<option value="${x.id}" ${x.id===sel?"selected":""}>${esc(x.name)}</option>`).join("")}`;
  shell(`<section class="card p-5"><h2 class="text-2xl font-black">Admin</h2>
  <h3 class="font-black mt-4">Settings</h3><div class="grid md:grid-cols-6 gap-2">
  <input id="entry" class="input" value="${base.settings.entry_fee}"><input id="adminpct" class="input" value="${base.settings.admin_percentage}"><input id="firstpct" class="input" value="${base.settings.first_place_percentage}"><input id="secondpct" class="input" value="${base.settings.second_place_percentage}"><input id="thirdpct" class="input" value="${base.settings.third_place_percentage}"><input id="lockmin" class="input" value="${base.settings.lock_minutes_before_match}">
  </div><button class="btn btn-primary mt-2" onclick="saveSettings()">Guardar settings</button></section>
  <section class="card p-5"><h3 class="font-black">Usuarios</h3>${users.map(u=>`<div class="flex gap-2 mt-2"><span class="flex-1">${esc(u.display_name)} @${esc(u.username)}</span><select id="pay-${u.id}" class="input w-40"><option ${u.payment_status==="UNPAID"?"selected":""}>UNPAID</option><option ${u.payment_status==="PAID"?"selected":""}>PAID</option></select><button class="btn btn-primary" onclick="savePay('${u.id}')">Guardar</button></div>`).join("")}</section>
  <section class="card p-5"><h3 class="font-black">Resultados</h3>${matches.map(m=>`<div class="flex gap-2 mt-2 flex-wrap"><b class="flex-1">${esc(m.home?.name)} vs ${esc(m.away?.name)}</b><input id="rh-${m.id}" class="input w-20" value="${m.home_score??""}"><input id="ra-${m.id}" class="input w-20" value="${m.away_score??""}"><select id="st-${m.id}" class="input w-36"><option ${m.status==="SCHEDULED"?"selected":""}>SCHEDULED</option><option ${m.status==="FINISHED"?"selected":""}>FINISHED</option></select><button class="btn btn-primary" onclick="saveMatch('${m.id}')">Guardar</button></div>`).join("")}</section>
  <section class="card p-5"><h3 class="font-black">Especiales reales</h3><div class="grid md:grid-cols-4 gap-2"><select id="srchamp" class="input">${opts(teams,sr?.champion_team_id)}</select><select id="srrunner" class="input">${opts(teams,sr?.runner_up_team_id)}</select><select id="srthird" class="input">${opts(teams,sr?.third_place_team_id)}</select><select id="srscorer" class="input">${opts(players,sr?.top_scorer_player_id)}</select></div><button class="btn btn-primary mt-2" onclick="saveSR()">Guardar especiales reales</button></section>`);
}
async function saveSettings(){const p={id:1,entry_fee:Number(val("entry")),admin_percentage:Number(val("adminpct")),first_place_percentage:Number(val("firstpct")),second_place_percentage:Number(val("secondpct")),third_place_percentage:Number(val("thirdpct")),lock_minutes_before_match:Number(val("lockmin"))}; const {error}=await sb.from("settings").upsert(p); toast(error?error.message:"OK"); await loadBase();}
async function savePay(id){const {error}=await sb.from("profiles").update({payment_status:val("pay-"+id)}).eq("id",id); toast(error?error.message:"OK");}
async function saveMatch(id){const {error}=await sb.from("matches").update({home_score:val("rh-"+id)===""?null:Number(val("rh-"+id)),away_score:val("ra-"+id)===""?null:Number(val("ra-"+id)),status:val("st-"+id)}).eq("id",id); toast(error?error.message:"OK");}
async function saveSR(){const p={tournament_id:base.tournament.id,champion_team_id:val("srchamp")||null,runner_up_team_id:val("srrunner")||null,third_place_team_id:val("srthird")||null,top_scorer_player_id:val("srscorer")||null}; const {error}=await sb.from("special_results").upsert(p,{onConflict:"tournament_id"}); toast(error?error.message:"OK");}

function render(){ if(!session) return auth(); if(!profile) return app.innerHTML="Cargando..."; home(); }
window.auth=auth; window.register=register; window.login=login; window.logout=logout; window.resetPassword=resetPassword;
window.savePrediction=savePrediction; window.saveSpecials=saveSpecials; window.saveSettings=saveSettings; window.savePay=savePay; window.saveMatch=saveMatch; window.saveSR=saveSR;
init();
