import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, push, set, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app=initializeApp(firebaseConfig),db=getDatabase(app),$=id=>document.getElementById(id);
let authed=sessionStorage.getItem('tr_admin')==='1',moments={},allMessages={},subscribed=false;
const USER_HASH='8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
const PASS_HASH='10993a59dae822b56f42323c444f47978e04f72ec88bfb2a319e96a47d9b34e7';
const animationLabels={cauldron:'🔥 Chaudron',book:'📖 Livre',fireworks:'🎆 Feu d’artifice',petals:'🌸 Pétales',random:'✨ Surprise'};
const themes=['Famille','Amis','Anniversaire','Soutien','Travail','Vacances','Libre'];

async function hash(value){const bytes=new TextEncoder().encode(value);const result=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function showAuth(){$('loginCard').classList.toggle('hidden',authed);$('adminApp').classList.toggle('hidden',!authed);if(authed&&!subscribed){subscribed=true;subscribe()}}
showAuth();

$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';const btn=e.submitter;btn.disabled=true;btn.textContent='Connexion…';try{const [u,p]=await Promise.all([hash($('login').value.trim()),hash($('password').value)]);if(u===USER_HASH&&p===PASS_HASH){authed=true;sessionStorage.setItem('tr_admin','1');showAuth()}else $('loginError').textContent='Identifiant ou mot de passe incorrect.'}finally{btn.disabled=false;btn.textContent='Se connecter'}});
$('logout').onclick=()=>{sessionStorage.removeItem('tr_admin');authed=false;showAuth()};
$('finalPreset').onchange=()=>{$('finalText').value=$('finalPreset').value};
$('finalText').value=$('finalPreset').value;
$('closeModal').onclick=closeModal;
$('adminModal').onclick=e=>{if(e.target===$('adminModal'))closeModal()};

$('momentForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter,title=$('title').value.trim(),target=Number($('target').value),durationHours=Number($('duration').value),finalText=$('finalText').value.trim();
  if(!title){$('createStatus').textContent='Ajoute un titre au moment.';$('title').focus();return}
  if(!Number.isFinite(target)||target<1){$('createStatus').textContent='Le nombre de participants doit être au moins égal à 1.';$('target').focus();return}
  if(!Number.isFinite(durationHours)||durationHours<1){$('createStatus').textContent='Choisis une durée valide.';return}
  if(!finalText){$('createStatus').textContent='Ajoute une phrase finale.';$('finalText').focus();return}
  btn.disabled=true;btn.textContent='Création en cours…';$('createStatus').textContent='Création en cours…';
  try{
    const now=Date.now();
    const moment={title,target:Math.round(target),intro:$('intro').value.trim(),theme:$('theme').value,durationHours,startsAt:now,endsAt:now+durationHours*36e5,finalText,confirmPost:$('confirmPost').checked,allowWithdrawal:$('allowWithdrawal').checked,confirmEdit:$('confirmEdit').checked,confirmDelete:$('confirmDelete').checked,animationType:$('animationType').value,gaugeVisibility:$('gaugeVisibility').value,forceFinal:false,archived:false,createdAt:now};
    const newRef=push(ref(db,'moments'));await set(newRef,moment);
    const url=momentUrl(newRef.key);
    $('createStatus').innerHTML=`<strong>Moment créé avec succès ✨</strong><br><a href="${url}" target="_blank">Ouvrir le lien participant</a><br><button type="button" class="secondary" id="copyLink">📋 Copier le lien</button>`;
    $('copyLink').onclick=async()=>{await navigator.clipboard.writeText(url);$('copyLink').textContent='✓ Lien copié'};
    e.target.reset();$('finalText').value=$('finalPreset').value;
  }catch(err){console.error(err);$('createStatus').textContent='Impossible de créer le moment. Vérifie la connexion et les règles Firebase.'}
  finally{btn.disabled=false;btn.textContent='✨ Créer le moment'}
});

function subscribe(){onValue(ref(db,'moments'),s=>{moments=s.val()||{};render()});onValue(ref(db,'messages'),s=>{allMessages=s.val()||{};render()});setInterval(()=>{if(authed)render()},30000)}
function momentUrl(id,preview=false){const base=`${location.origin}${location.pathname.replace(/admin\.html$/,'')}`;return `${base}?m=${id}${preview?'&preview=1':''}`}
function allMomentMessages(id){return Object.entries(allMessages[id]||{}).filter(([,m])=>m)}
function activeMessages(id){return allMomentMessages(id).filter(([,m])=>!m.deleted)}
function deletedMessages(id){return allMomentMessages(id).filter(([,m])=>m.deleted)}
function stateOf(m){if(m.archived)return['🗄 Archivé','archived'];if(m.forceFinal||Date.now()>=m.endsAt)return['✨ Terminé','closed'];return['🟢 Ouvert','open']}
function fmt(ms){return ms?new Date(ms).toLocaleString('fr-FR'):'—'}

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
      <button class="primary copy">📋 Copier le lien</button><a class="secondary" target="_blank" href="${momentUrl(id)}">👁 Ouvrir</a><button class="secondary messages">💬 Voir les messages</button><button class="launch">🔥 Lancer la cérémonie</button>
    </div>
    <details class="more-actions"><summary>⋯ Plus d’actions</summary><div class="action-grid"><button class="secondary edit">✏️ Modifier</button><button class="secondary preview">❤️ Prévisualiser</button><button class="secondary closeMoment">🔒 Clôturer</button><button class="secondary reopen">↺ Rouvrir</button><button class="secondary archive">${m.archived?'📤 Désarchiver':'🗄 Archiver'}</button><button class="danger reset">♻ Réinitialiser</button><button class="danger delete">🗑 Supprimer</button></div></details>`;
  card.querySelector('.copy').onclick=async e=>{await navigator.clipboard.writeText(momentUrl(id));e.currentTarget.textContent='✓ Lien copié';setTimeout(()=>e.currentTarget.textContent='📋 Copier le lien',1800)};
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
function options(values,current){return values.map(v=>`<option value="${escapeHtml(v)}" ${v===current?'selected':''}>${escapeHtml(v)}</option>`).join('')}
function check(id,label,checked){return `<label class="check"><input id="${id}" type="checkbox" ${checked?'checked':''}> ${label}</label>`}

function editMoment(id,m){
  openModal(`<p class="eyebrow">MODIFIER</p><h2>${escapeHtml(m.title)}</h2><form id="editForm"><label>Titre<input id="eTitle" value="${escapeHtml(m.title)}" required></label><label>Introduction<textarea id="eIntro" rows="3">${escapeHtml(m.intro||'')}</textarea></label><div class="grid two"><label>Participants prévus<input id="eTarget" type="number" min="1" value="${m.target||1}" required></label><label>Thème<select id="eTheme">${options(themes,m.theme||'Libre')}</select></label></div><div class="grid two"><label>Durée à partir de maintenant<select id="eDuration"><option value="6">6 heures</option><option value="12">12 heures</option><option value="24">24 heures</option><option value="48">2 jours</option><option value="72">3 jours</option><option value="168">7 jours</option></select></label><label>Jauge<select id="eGauge"><option value="visible">Visible</option><option value="hidden">Masquée</option></select></label></div><p class="notice">La date de fin sera recalculée à partir du moment où tu enregistres.</p><label>Phrase finale<textarea id="eFinal" rows="3" required>${escapeHtml(m.finalText||'')}</textarea></label><label>Animation<select id="eAnimation"><option value="cauldron">🔥 Chaudron</option><option value="book">📖 Livre</option><option value="fireworks">🎆 Feu d’artifice</option><option value="petals">🌸 Pétales</option><option value="random">✨ Surprise</option></select></label><h3>Participation</h3><div class="grid two">${check('eConfirmPost','Confirmer avant l’envoi',m.confirmPost!==false)}${check('eAllowWithdrawal','Autoriser le retrait',m.allowWithdrawal!==false)}${check('eConfirmEdit','Confirmer avant une modification',m.confirmEdit!==false)}${check('eConfirmDelete','Confirmer avant le retrait',m.confirmDelete!==false)}</div><button class="primary big">Enregistrer les modifications</button></form>`);
  $('eAnimation').value=m.animationType||'cauldron';$('eGauge').value=m.gaugeVisibility||'visible';$('eDuration').value=String(m.durationHours||24);
  $('editForm').onsubmit=async e=>{e.preventDefault();const durationHours=Number($('eDuration').value),title=$('eTitle').value.trim(),target=Math.max(1,Number($('eTarget').value)||1),finalText=$('eFinal').value.trim();if(!title||!finalText)return;if(!confirm('Enregistrer ces modifications ? La nouvelle durée commencera maintenant.'))return;const btn=e.submitter;btn.disabled=true;btn.textContent='Enregistrement…';try{await update(ref(db,`moments/${id}`),{title,intro:$('eIntro').value.trim(),target,durationHours,endsAt:Date.now()+durationHours*36e5,finalText,theme:$('eTheme').value,animationType:$('eAnimation').value,gaugeVisibility:$('eGauge').value,confirmPost:$('eConfirmPost').checked,allowWithdrawal:$('eAllowWithdrawal').checked,confirmEdit:$('eConfirmEdit').checked,confirmDelete:$('eConfirmDelete').checked,updatedAt:Date.now()});closeModal()}catch(err){console.error(err);btn.disabled=false;btn.textContent='Enregistrer les modifications';alert('La modification a échoué. Vérifie ta connexion.')}};
}

function showMessages(id,m){
  const active=activeMessages(id).sort((a,b)=>(b[1].updatedAt||b[1].createdAt)-(a[1].updatedAt||a[1].createdAt));
  const deleted=deletedMessages(id).sort((a,b)=>(b[1].deletedAt||0)-(a[1].deletedAt||0));
  const activeRows=active.map(([mid,msg])=>`<article class="admin-message"><div><strong>${escapeHtml(msg.emotion||'')} ${escapeHtml(msg.anonymous?'Anonyme':msg.name||'Anonyme')}</strong><small>${fmt(msg.updatedAt||msg.createdAt)}</small></div><p>${escapeHtml(msg.text||'')}</p><button class="danger mini" data-delete-mid="${mid}">Retirer</button></article>`).join('');
  const deletedRows=deleted.map(([mid,msg])=>`<article class="admin-message deleted-message"><div><strong>${escapeHtml(msg.emotion||'')} ${escapeHtml(msg.anonymous?'Anonyme':msg.name||'Anonyme')}</strong><small>Retiré le ${fmt(msg.deletedAt)}</small></div><p>${escapeHtml(msg.text||'')}</p><button class="secondary mini" data-restore-mid="${mid}">Restaurer</button></article>`).join('');
  openModal(`<p class="eyebrow">MESSAGES</p><h2>${escapeHtml(m.title)}</h2><p>${active.length} participation(s) active(s)</p><div>${activeRows||'<p>Aucun message actif.</p>'}</div>${deleted.length?`<details class="more-actions"><summary>🗑 Messages retirés (${deleted.length})</summary><div>${deletedRows}</div></details>`:''}`);
  document.querySelectorAll('[data-delete-mid]').forEach(btn=>btn.onclick=async()=>{if(confirm('Retirer ce message ? Tu pourras le restaurer ensuite.')){await update(ref(db,`messages/${id}/${btn.dataset.deleteMid}`),{deleted:true,deletedAt:Date.now(),deletedBy:'admin'});showMessages(id,m)}});
  document.querySelectorAll('[data-restore-mid]').forEach(btn=>btn.onclick=async()=>{await update(ref(db,`messages/${id}/${btn.dataset.restoreMid}`),{deleted:false,deletedAt:null,deletedBy:null,restoredAt:Date.now()});showMessages(id,m)});
}

async function launchCeremony(id,m){if(!confirm('Lancer maintenant la cérémonie ? Les participants ne pourront plus publier.'))return;await update(ref(db,`moments/${id}`),{forceFinal:true,launchedAt:Date.now()});window.open(momentUrl(id),'_blank')}
async function closeMoment(id,m){if(!confirm('Clôturer ce moment maintenant ? Les participants ne pourront plus publier.'))return;await update(ref(db,`moments/${id}`),{forceFinal:true,closedAt:Date.now()})}
async function reopenMoment(id,m){const hours=prompt('Pendant combien d’heures veux-tu rouvrir ce moment ?',m.durationHours||24);if(hours===null)return;const durationHours=Math.max(1,Number(hours)||24);if(!confirm(`Rouvrir pendant ${durationHours} heure(s) en conservant les messages ?`))return;await update(ref(db,`moments/${id}`),{durationHours,startsAt:Date.now(),endsAt:Date.now()+durationHours*36e5,forceFinal:false,reopenedAt:Date.now()})}
async function resetMoment(id,m){const count=activeMessages(id).length;if(!confirm(`Réinitialiser ce moment supprimera définitivement ${count} message(s) et relancera le délai. Continuer ?`))return;const durationHours=Math.max(1,Number(m.durationHours)||24);await remove(ref(db,`messages/${id}`));await update(ref(db,`moments/${id}`),{startsAt:Date.now(),endsAt:Date.now()+durationHours*36e5,forceFinal:false,resetAt:Date.now()})}
async function deleteMoment(id,m){if(!confirm(`Supprimer définitivement « ${m.title} » et toutes ses phrases ? Cette action est irréversible.`))return;await remove(ref(db,`messages/${id}`));await remove(ref(db,`moments/${id}`))}