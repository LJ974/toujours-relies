import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, push, set, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app=initializeApp(firebaseConfig),db=getDatabase(app),$=id=>document.getElementById(id);
let authed=sessionStorage.getItem('tr_admin')==='1',moments={},allMessages={},subscribed=false;
const USER_HASH='8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
const PASS_HASH='48aef22b5e62edb5aac488c1826658e479684ff481292116b45763d860bdc5be';
const animationLabels={cauldron:'🔥 Chaudron',book:'📖 Livre',fireworks:'🎆 Feu d’artifice',petals:'🌸 Pétales',random:'✨ Surprise'};

async function hash(value){const bytes=new TextEncoder().encode(value);const result=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function showAuth(){$('loginCard').classList.toggle('hidden',authed);$('adminApp').classList.toggle('hidden',!authed);if(authed&&!subscribed){subscribed=true;subscribe()}}
showAuth();

$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';const [u,p]=await Promise.all([hash($('login').value.trim()),hash($('password').value)]);if(u===USER_HASH&&p===PASS_HASH){authed=true;sessionStorage.setItem('tr_admin','1');showAuth()}else $('loginError').textContent='Identifiant ou mot de passe incorrect.'});
$('logout').onclick=()=>{sessionStorage.removeItem('tr_admin');authed=false;showAuth()};
$('finalPreset').onchange=()=>{$('finalText').value=$('finalPreset').value};
$('finalText').value=$('finalPreset').value;
$('closeModal').onclick=closeModal;
$('adminModal').onclick=e=>{if(e.target===$('adminModal'))closeModal()};

$('momentForm').addEventListener('submit',async e=>{
  e.preventDefault();$('createStatus').textContent='Création en cours…';
  try{
    const now=Date.now(),durationHours=Number($('duration').value);
    const moment={title:$('title').value.trim(),target:Number($('target').value),intro:$('intro').value.trim(),theme:$('theme').value,durationHours,startsAt:now,endsAt:now+durationHours*36e5,finalText:$('finalText').value.trim(),confirmPost:$('confirmPost').checked,allowWithdrawal:$('allowWithdrawal').checked,confirmEdit:$('confirmEdit').checked,confirmDelete:$('confirmDelete').checked,animationType:$('animationType').value,gaugeVisibility:$('gaugeVisibility').value,forceFinal:false,archived:false,createdAt:now};
    const newRef=push(ref(db,'moments'));await set(newRef,moment);
    const url=momentUrl(newRef.key);
    $('createStatus').innerHTML=`Moment créé ✨ <a href="${url}" target="_blank">Ouvrir le lien participant</a><br><button type="button" class="secondary" id="copyLink">Copier le lien</button>`;
    $('copyLink').onclick=()=>navigator.clipboard.writeText(url);
    e.target.reset();$('finalText').value=$('finalPreset').value;
  }catch(err){console.error(err);$('createStatus').textContent='Impossible de créer le moment. Vérifie les règles Firebase.'}
});

function subscribe(){onValue(ref(db,'moments'),s=>{moments=s.val()||{};render()});onValue(ref(db,'messages'),s=>{allMessages=s.val()||{};render()})}
function momentUrl(id,preview=false){const base=`${location.origin}${location.pathname.replace(/admin\.html$/,'')}`;return `${base}?m=${id}${preview?'&preview=1':''}`}
function activeMessages(id){return Object.entries(allMessages[id]||{}).filter(([,m])=>m&&!m.deleted)}
function stateOf(m){if(m.archived)return['🗄 Archivé','archived'];if(m.forceFinal||Date.now()>=m.endsAt)return['✨ Terminé','closed'];return['🟢 Ouvert','open']}
function fmt(ms){return new Date(ms).toLocaleString('fr-FR')}

function render(){
  const active=$('momentsList'),archives=$('archivesList');active.innerHTML='';archives.innerHTML='';
  const entries=Object.entries(moments).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
  entries.forEach(([id,m])=>{const card=momentCard(id,m);(m.archived?archives:active).appendChild(card)});
  if(!active.children.length)active.innerHTML='<p class="muted">Aucun moment actif.</p>';
  if(!archives.children.length)archives.innerHTML='<p class="muted">Aucun moment archivé.</p>';
}

function momentCard(id,m){
  const count=activeMessages(id).length,pct=Math.min(100,Math.round(count/Math.max(1,m.target||1)*100));
  const [state,stateClass]=stateOf(m),closed=stateClass==='closed';
  const card=document.createElement('article');card.className='moment-admin dashboard-card';
  card.innerHTML=`
    <div class="moment-top"><div><span class="status-pill ${stateClass}">${state}</span><h3>${escapeHtml(m.title||'Sans titre')}</h3><p class="muted">${escapeHtml(m.theme||'Libre')} · ${animationLabels[m.animationType]||animationLabels.cauldron}</p></div><div class="metric"><strong>${count}/${m.target||1}</strong><span>participations</span></div></div>
    <div class="progress"><div style="width:${pct}%"></div></div>
    <div class="moment-meta"><span>${pct}%</span><span>Fin : ${fmt(m.endsAt)}</span></div>
    <div class="action-grid primary-actions">
      <button class="primary copy">📋 Copier le lien</button><a class="secondary" target="_blank" href="${momentUrl(id)}">👁 Ouvrir</a><button class="secondary edit">✏️ Modifier</button><button class="secondary messages">💬 Voir les messages</button>
    </div>
    <div class="ceremony-actions"><button class="secondary preview">❤️ Prévisualiser</button><button class="launch">🔥 Lancer la cérémonie</button></div>
    <details class="more-actions"><summary>⋯ Plus d’actions</summary><div class="action-grid"><button class="secondary closeMoment">🔒 Clôturer</button><button class="secondary reopen">↺ Rouvrir</button><button class="secondary archive">${m.archived?'📤 Désarchiver':'🗄 Archiver'}</button><button class="danger reset">♻ Réinitialiser</button><button class="danger delete">🗑 Supprimer</button></div></details>`;
  card.querySelector('.copy').onclick=()=>navigator.clipboard.writeText(momentUrl(id));
  card.querySelector('.edit').onclick=()=>editMoment(id,m);
  card.querySelector('.messages').onclick=()=>showMessages(id,m);
  card.querySelector('.preview').onclick=()=>window.open(momentUrl(id,true),'_blank');
  card.querySelector('.launch').onclick=()=>launchCeremony(id,m);
  card.querySelector('.closeMoment').onclick=()=>closeMoment(id,m);
  card.querySelector('.reopen').onclick=()=>reopenMoment(id,m);
  card.querySelector('.archive').onclick=()=>update(ref(db,`moments/${id}`),{archived:!m.archived,archivedAt:!m.archived?Date.now():null});
  card.querySelector('.reset').onclick=()=>resetMoment(id,m);
  card.querySelector('.delete').onclick=()=>deleteMoment(id,m);
  if(closed)card.querySelector('.closeMoment').disabled=true;
  return card;
}

function openModal(html){$('modalContent').innerHTML=html;$('adminModal').classList.remove('hidden')}
function closeModal(){$('adminModal').classList.add('hidden');$('modalContent').innerHTML=''}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function editMoment(id,m){
  openModal(`<p class="eyebrow">MODIFIER</p><h2>${escapeHtml(m.title)}</h2><form id="editForm"><label>Titre<input id="eTitle" value="${escapeHtml(m.title)}" required></label><label>Introduction<textarea id="eIntro" rows="3">${escapeHtml(m.intro||'')}</textarea></label><div class="grid two"><label>Participants prévus<input id="eTarget" type="number" min="1" value="${m.target||1}"></label><label>Durée à partir de maintenant<select id="eDuration"><option value="6">6 heures</option><option value="12">12 heures</option><option value="24">24 heures</option><option value="48">2 jours</option><option value="72">3 jours</option><option value="168">7 jours</option></select></label></div><label>Phrase finale<textarea id="eFinal" rows="3">${escapeHtml(m.finalText||'')}</textarea></label><div class="grid two"><label>Animation<select id="eAnimation"><option value="cauldron">🔥 Chaudron</option><option value="book">📖 Livre</option><option value="fireworks">🎆 Feu d’artifice</option><option value="petals">🌸 Pétales</option><option value="random">✨ Surprise</option></select></label><label>Jauge<select id="eGauge"><option value="visible">Visible</option><option value="hidden">Masquée</option></select></label></div><button class="primary big">Enregistrer les modifications</button></form>`);
  $('eAnimation').value=m.animationType||'cauldron';$('eGauge').value=m.gaugeVisibility||'visible';$('eDuration').value=String(m.durationHours||24);
  $('editForm').onsubmit=async e=>{e.preventDefault();const durationHours=Number($('eDuration').value);if(!confirm('Enregistrer ces modifications sur le moment en cours ?'))return;await update(ref(db,`moments/${id}`),{title:$('eTitle').value.trim(),intro:$('eIntro').value.trim(),target:Math.max(1,Number($('eTarget').value)||1),durationHours,endsAt:Date.now()+durationHours*36e5,finalText:$('eFinal').value.trim(),animationType:$('eAnimation').value,gaugeVisibility:$('eGauge').value,updatedAt:Date.now()});closeModal()};
}

function showMessages(id,m){
  const rows=activeMessages(id).sort((a,b)=>(b[1].updatedAt||b[1].createdAt)-(a[1].updatedAt||a[1].createdAt)).map(([mid,msg])=>`<article class="admin-message"><div><strong>${escapeHtml(msg.emotion||'')} ${escapeHtml(msg.anonymous?'Anonyme':msg.name||'Anonyme')}</strong><small>${fmt(msg.updatedAt||msg.createdAt)}</small></div><p>${escapeHtml(msg.text||'')}</p><button class="danger mini" data-mid="${mid}">Supprimer</button></article>`).join('');
  openModal(`<p class="eyebrow">MESSAGES</p><h2>${escapeHtml(m.title)}</h2><p>${activeMessages(id).length} participation(s) active(s)</p><div>${rows||'<p>Aucun message.</p>'}</div>`);
  document.querySelectorAll('[data-mid]').forEach(btn=>btn.onclick=async()=>{if(confirm('Supprimer ce message ?')){await remove(ref(db,`messages/${id}/${btn.dataset.mid}`));showMessages(id,m)}})
}

async function launchCeremony(id,m){if(!confirm('Lancer maintenant la cérémonie ? Les participants ne pourront plus publier.'))return;await update(ref(db,`moments/${id}`),{forceFinal:true,launchedAt:Date.now()});window.open(momentUrl(id),'_blank')}
async function closeMoment(id,m){if(!confirm('Clôturer ce moment maintenant ? Les participants ne pourront plus publier.'))return;await update(ref(db,`moments/${id}`),{forceFinal:true,closedAt:Date.now()})}
async function reopenMoment(id,m){const hours=prompt('Pendant combien d’heures veux-tu rouvrir ce moment ?',m.durationHours||24);if(hours===null)return;const durationHours=Math.max(1,Number(hours)||24);if(!confirm(`Rouvrir pendant ${durationHours} heure(s) en conservant les messages ?`))return;await update(ref(db,`moments/${id}`),{durationHours,startsAt:Date.now(),endsAt:Date.now()+durationHours*36e5,forceFinal:false,reopenedAt:Date.now()})}
async function resetMoment(id,m){const count=activeMessages(id).length;if(!confirm(`Réinitialiser ce moment supprimera définitivement ${count} message(s) et relancera le délai. Continuer ?`))return;const durationHours=Math.max(1,Number(m.durationHours)||24);await remove(ref(db,`messages/${id}`));await update(ref(db,`moments/${id}`),{startsAt:Date.now(),endsAt:Date.now()+durationHours*36e5,forceFinal:false,resetAt:Date.now()})}
async function deleteMoment(id,m){if(!confirm(`Supprimer définitivement « ${m.title} » et toutes ses phrases ?`))return;await remove(ref(db,`messages/${id}`));await remove(ref(db,`moments/${id}`))}
