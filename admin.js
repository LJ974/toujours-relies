import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, push, set, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app=initializeApp(firebaseConfig),db=getDatabase(app),$=id=>document.getElementById(id);
let authed=sessionStorage.getItem('tr_admin')==='1',moments={},allMessages={},subscribed=false;
const USER_HASH='8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
const PASS_HASH='10993a59dae822b56f42323c444f47978e04f72ec88bfb2a319e96a47d9b34e7';
const animationLabels={cauldron:'🔥 Chaudron',book:'📖 Livre',fireworks:'🎆 Feu d’artifice',petals:'🌸 Pétales',random:'✨ Surprise'};
const library={
  'Instant du jour':{
    questions:['Quel moment de ta journée souhaites-tu déposer ici ?','Dépose un moment joyeux, ordinaire ou difficile de ta journée.','En quelques mots, comment s’est passée ta journée ?','Quel instant a le plus marqué ta journée ?'],
    finals:['Merci d’avoir déposé un morceau de votre journée. Chaque émotion a trouvé sa place ici.','Ce qui était léger peut continuer de briller. Ce qui était lourd a trouvé un endroit où se poser.','Vos journées étaient différentes, mais vos histoires se sont rejointes dans ce moment partagé.','Dans ce moment, il n’y avait ni bonne ni mauvaise émotion : seulement des instants de vie partagés.']
  },
  'Gratitude':{
    questions:['Qui aimerais-tu remercier aujourd’hui, et pourquoi ?','Dépose un mot de gratitude.','Quel petit bonheur souhaites-tu partager ?','Pour quoi te sens-tu reconnaissant aujourd’hui ?'],
    finals:['Merci d’avoir partagé ces mots de gratitude. Ensemble, ils font grandir la lumière.','Chaque merci déposé ici a rendu ce moment plus précieux.','Les petites reconnaissances créent de grands liens. Merci pour votre participation.']
  },
  'Souvenirs':{
    questions:['Quel souvenir te fait encore sourire ?','Quel moment aimerais-tu revivre ?','Partage un souvenir que tu garderas longtemps.','Quel instant partagé t’a particulièrement marqué ?'],
    finals:['Merci d’avoir partagé un morceau de votre histoire.','Chaque souvenir déposé ici contribue à écrire votre histoire commune.','Ce moment se termine, mais les souvenirs restent.']
  },
  'Encouragement':{
    questions:['Écris quelques mots qui pourraient donner du courage à quelqu’un.','Quel message aurais-tu aimé entendre aujourd’hui ?','Dépose une phrase qui donne envie d’avancer.','Quel conseil bienveillant souhaites-tu partager ?'],
    finals:['Vos mots peuvent continuer d’accompagner ceux qui en ont besoin.','Merci d’avoir ajouté du courage et de la douceur à ce moment.','Chaque encouragement partagé peut devenir une force pour quelqu’un.']
  },
  'Cohésion':{
    questions:['Quel mot décrit le mieux notre groupe ?','Quelle qualité apprécies-tu dans cette équipe ?','Qu’est-ce qui nous rassemble ?','De quoi es-tu fier dans ce groupe ?'],
    finals:['Vos différences ont créé quelque chose d’unique. Merci d’avoir contribué à ce moment collectif.','Chaque voix compte et chacune a renforcé le lien qui vous unit.','Ce moment rappelle que l’on avance mieux lorsque chacun trouve sa place.']
  },
  'Célébration':{
    questions:['Quelle victoire souhaites-tu célébrer ?','Quel moment mérite d’être applaudi ?','Quelle réussite te rend fier aujourd’hui ?','Qu’aimerais-tu fêter avec le groupe ?'],
    finals:['Bravo pour toutes les victoires déposées ici, grandes ou petites.','Merci d’avoir fait de cette célébration un moment collectif.','Chaque réussite partagée rend la joie encore plus grande.']
  },
  'Anniversaire':{
    questions:['Quel est ton plus beau souvenir avec cette personne ?','Quel vœu souhaites-tu lui offrir ?','Quelle qualité admires-tu chez elle ?','Dépose un petit message du cœur.'],
    finals:['Tous ces mots réunis forment un cadeau unique. Joyeux anniversaire !','Merci d’avoir rendu cet anniversaire encore plus précieux.','Que tous ces souvenirs et ces vœux accompagnent cette nouvelle année.']
  },
  'Départ':{
    questions:['Quel souvenir souhaites-tu laisser à cette personne ?','Quel mot aimerais-tu lui dire avant son départ ?','Quelle qualité retiendras-tu d’elle ?','Quel souhait lui adresses-tu pour la suite ?'],
    finals:['Un chapitre se termine, mais les liens et les souvenirs restent.','Merci d’avoir partagé ces mots pour accompagner ce nouveau départ.','Que tous ces messages voyagent avec toi pour la suite.']
  },
  'Libre':{
    questions:['Écris ici la question de ton choix.'],
    finals:['Merci d’avoir participé à ce moment collectif.','Chaque participation a rendu ce moment unique.','Même sans parler tous les jours… on reste reliés. ❤️']
  }
};
const themes=Object.keys(library);

async function hash(value){const bytes=new TextEncoder().encode(value);const result=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function showAuth(){$('loginCard').classList.toggle('hidden',authed);$('adminApp').classList.toggle('hidden',!authed);if(authed&&!subscribed){subscribed=true;subscribe()}}
function fillSelect(select,values){select.innerHTML='';values.forEach(v=>select.add(new Option(v,v)))}
function loadThemeTexts(reset=true){const data=library[$('theme').value]||library.Libre;fillSelect($('questionPreset'),data.questions);fillSelect($('finalPreset'),data.finals);if(reset){$('questionText').value=data.questions[0];$('finalText').value=data.finals[0]}}
function setupCreationForm(){fillSelect($('theme'),themes);$('theme').value='Instant du jour';loadThemeTexts(true);$('theme').onchange=()=>loadThemeTexts(true);$('questionPreset').onchange=()=>{$('questionText').value=$('questionPreset').value};$('finalPreset').onchange=()=>{$('finalText').value=$('finalPreset').value}}
showAuth();setupCreationForm();

$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';const btn=e.submitter;btn.disabled=true;btn.textContent='Connexion…';try{const [u,p]=await Promise.all([hash($('login').value.trim()),hash($('password').value)]);if(u===USER_HASH&&p===PASS_HASH){authed=true;sessionStorage.setItem('tr_admin','1');showAuth()}else $('loginError').textContent='Identifiant ou mot de passe incorrect.'}finally{btn.disabled=false;btn.textContent='Se connecter'}});
$('logout').onclick=()=>{sessionStorage.removeItem('tr_admin');authed=false;showAuth()};
$('closeModal').onclick=closeModal;$('adminModal').onclick=e=>{if(e.target===$('adminModal'))closeModal()};

$('momentForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.submitter,title=$('title').value.trim(),target=Number($('target').value),durationHours=Number($('duration').value),questionText=$('questionText').value.trim(),finalText=$('finalText').value.trim();if(!title||!questionText||!finalText)return alert('Ajoute un titre, une question et une phrase finale.');btn.disabled=true;btn.textContent='Création en cours…';try{const now=Date.now();const moment={title,target:Math.max(1,Math.round(target)),intro:$('intro').value.trim(),questionText,theme:$('theme').value,durationHours,startsAt:now,endsAt:now+durationHours*36e5,finalText,confirmPost:$('confirmPost').checked,allowWithdrawal:$('allowWithdrawal').checked,confirmEdit:$('confirmEdit').checked,confirmDelete:$('confirmDelete').checked,allowShare:$('allowShare').checked,animationType:$('animationType').value,gaugeVisibility:$('gaugeVisibility').value,forceFinal:false,archived:false,createdAt:now};const newRef=push(ref(db,'moments'));await set(newRef,moment);const url=momentUrl(newRef.key);$('createStatus').innerHTML=`<strong>Moment créé avec succès ✨</strong><br><a href="${url}" target="_blank">Ouvrir le lien participant</a><br><button type="button" class="secondary" id="copyLink">📋 Copier le lien</button>`;$('copyLink').onclick=async()=>{await navigator.clipboard.writeText(url);$('copyLink').textContent='✓ Lien copié'};e.target.reset();setupCreationForm()}catch(err){console.error(err);$('createStatus').textContent='Impossible de créer le moment. Vérifie la connexion et les règles Firebase.'}finally{btn.disabled=false;btn.textContent='✨ Créer le moment'}});

function subscribe(){onValue(ref(db,'moments'),s=>{moments=s.val()||{};render()});onValue(ref(db,'messages'),s=>{allMessages=s.val()||{};render()});setInterval(()=>{if(authed)render()},30000)}
function momentUrl(id,preview=false){const base=`${location.origin}${location.pathname.replace(/admin\.html$/,'')}`;return `${base}?m=${id}${preview?'&preview=1':''}`}
function allMomentMessages(id){return Object.entries(allMessages[id]||{}).filter(([,m])=>m)}
function activeMessages(id){return allMomentMessages(id).filter(([,m])=>!m.deleted)}
function stateOf(m){if(m.archived)return['🗄 Archivé','archived'];if(m.forceFinal||Date.now()>=m.endsAt)return['✨ Terminé','closed'];return['🟢 Ouvert','open']}
function fmt(ms){return ms?new Date(ms).toLocaleString('fr-FR'):'—'}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function options(values,current){return values.map(v=>`<option value="${escapeHtml(v)}" ${v===current?'selected':''}>${escapeHtml(v)}</option>`).join('')}
function check(id,label,checked){return `<label class="check"><input id="${id}" type="checkbox" ${checked?'checked':''}> ${label}</label>`}
function render(){const active=$('momentsList'),archives=$('archivesList');active.innerHTML='';archives.innerHTML='';Object.entries(moments).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0)).forEach(([id,m])=>{const card=momentCard(id,m);(m.archived?archives:active).appendChild(card)});if(!active.children.length)active.innerHTML='<p class="muted">Aucun moment actif.</p>';if(!archives.children.length)archives.innerHTML='<p class="muted">Aucun moment archivé.</p>'}
function momentCard(id,m){const count=activeMessages(id).length,pct=Math.min(100,Math.round(count/Math.max(1,m.target||1)*100)),[state,stateClass]=stateOf(m);const card=document.createElement('article');card.className='moment-admin dashboard-card';card.innerHTML=`<div class="moment-top"><div><span class="status-pill ${stateClass}">${state}</span><h3>${escapeHtml(m.title||'Sans titre')}</h3><p class="muted">${escapeHtml(m.theme||'Libre')} · ${animationLabels[m.animationType]||animationLabels.cauldron}</p></div><div class="metric"><strong>${count}/${m.target||1}</strong><span>participations</span></div></div><p><strong>Question :</strong> ${escapeHtml(m.questionText||m.intro||'')}</p><div class="progress"><div style="width:${pct}%"></div></div><div class="moment-meta"><span>${pct}%</span><span>Fin : ${fmt(m.endsAt)}</span></div><div class="action-grid primary-actions"><button class="primary copy">📋 Copier le lien</button><a class="secondary" target="_blank" href="${momentUrl(id)}">👁 Ouvrir</a><button class="secondary edit">✏️ Modifier</button><button class="launch">🔥 Lancer la cérémonie</button></div><details class="more-actions"><summary>⋯ Plus d’actions</summary><div class="action-grid"><button class="secondary preview">❤️ Prévisualiser</button><button class="secondary archive">${m.archived?'📤 Désarchiver':'🗄 Archiver'}</button><button class="danger reset">♻ Réinitialiser</button><button class="danger delete">🗑 Supprimer</button></div></details>`;card.querySelector('.copy').onclick=async e=>{await navigator.clipboard.writeText(momentUrl(id));e.currentTarget.textContent='✓ Lien copié'};card.querySelector('.edit').onclick=()=>editMoment(id,m);card.querySelector('.preview').onclick=()=>window.open(momentUrl(id,true),'_blank');card.querySelector('.launch').onclick=()=>launchCeremony(id);card.querySelector('.archive').onclick=()=>update(ref(db,`moments/${id}`),{archived:!m.archived});card.querySelector('.reset').onclick=()=>resetMoment(id,m);card.querySelector('.delete').onclick=()=>deleteMoment(id,m);return card}
function openModal(html){$('modalContent').innerHTML=html;$('adminModal').classList.remove('hidden')}
function closeModal(){$('adminModal').classList.add('hidden');$('modalContent').innerHTML=''}
function editMoment(id,m){openModal(`<p class="eyebrow">MODIFIER</p><h2>${escapeHtml(m.title)}</h2><form id="editForm"><label>Titre<input id="eTitle" value="${escapeHtml(m.title)}" required></label><label>Introduction<textarea id="eIntro" rows="3">${escapeHtml(m.intro||'')}</textarea></label><label>Thème<select id="eTheme">${options(themes,m.theme||'Libre')}</select></label><label>Question proposée<select id="eQuestionPreset"></select></label><label>Question personnalisable<textarea id="eQuestion" rows="3" required>${escapeHtml(m.questionText||m.intro||'')}</textarea></label><label>Phrase finale proposée<select id="eFinalPreset"></select></label><label>Phrase finale personnalisable<textarea id="eFinal" rows="3" required>${escapeHtml(m.finalText||'')}</textarea></label><div class="grid two"><label>Participants prévus<input id="eTarget" type="number" min="1" value="${m.target||1}"></label><label>Animation<select id="eAnimation"><option value="cauldron">🔥 Chaudron</option><option value="book">📖 Livre</option><option value="fireworks">🎆 Feu d’artifice</option><option value="petals">🌸 Pétales</option><option value="random">✨ Surprise</option></select></label></div><div class="grid two">${check('eAllowWithdrawal','Autoriser le retrait',m.allowWithdrawal!==false)}${check('eAllowShare','Autoriser le partage',m.allowShare!==false)}</div><button class="primary big">Enregistrer</button></form>`);$('eAnimation').value=m.animationType||'cauldron';const reload=()=>{const d=library[$('eTheme').value]||library.Libre;fillSelect($('eQuestionPreset'),d.questions);fillSelect($('eFinalPreset'),d.finals)};reload();$('eTheme').onchange=reload;$('eQuestionPreset').onchange=()=>{$('eQuestion').value=$('eQuestionPreset').value};$('eFinalPreset').onchange=()=>{$('eFinal').value=$('eFinalPreset').value};$('editForm').onsubmit=async e=>{e.preventDefault();await update(ref(db,`moments/${id}`),{title:$('eTitle').value.trim(),intro:$('eIntro').value.trim(),theme:$('eTheme').value,questionText:$('eQuestion').value.trim(),finalText:$('eFinal').value.trim(),target:Math.max(1,Number($('eTarget').value)||1),animationType:$('eAnimation').value,allowWithdrawal:$('eAllowWithdrawal').checked,allowShare:$('eAllowShare').checked,updatedAt:Date.now()});closeModal()}}
async function launchCeremony(id){if(confirm('Lancer maintenant la cérémonie ?')){await update(ref(db,`moments/${id}`),{forceFinal:true,launchedAt:Date.now()});window.open(momentUrl(id),'_blank')}}
async function resetMoment(id,m){if(!confirm('Réinitialiser ce moment et supprimer ses messages ?'))return;await remove(ref(db,`messages/${id}`));await update(ref(db,`moments/${id}`),{startsAt:Date.now(),endsAt:Date.now()+(m.durationHours||24)*36e5,forceFinal:false})}
async function deleteMoment(id,m){if(!confirm(`Supprimer définitivement « ${m.title} » ?`))return;await remove(ref(db,`messages/${id}`));await remove(ref(db,`moments/${id}`))}
