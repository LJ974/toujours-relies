import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, onValue, update } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app=getApps()[0]||initializeApp(firebaseConfig);
const db=getDatabase(app);
const byId=id=>document.getElementById(id);
const CURRENT_VERSION='3.2';
let moments={};

const eveningQuestions=[
  'Quel moment de ta journée souhaites-tu déposer dans le chaudron ?',
  'Dépose un moment joyeux, ordinaire ou difficile de ta journée.',
  'Qu’aimerais-tu garder, accueillir ou laisser se poser ce soir ?'
];
const eveningFinals=[
  'Merci d’avoir partagé un morceau de toi.',
  'Chaque émotion a trouvé sa place ici. Merci d’avoir partagé une part de toi.',
  'Ce qui était léger peut continuer de briller. Ce qui était lourd a trouvé un endroit où se poser.'
];

function fill(select,values){if(!select)return;select.innerHTML='';values.forEach(value=>select.add(new Option(value,value)))}
function installEveningTheme(){
  const theme=byId('theme');
  if(!theme)return;
  if(![...theme.options].some(option=>option.value==='Chaudron du soir'))theme.add(new Option('🌙 Chaudron du soir','Chaudron du soir'),0);
  if(theme.dataset.v3Ready)return;
  theme.dataset.v3Ready='1';
  theme.addEventListener('change',()=>{
    if(theme.value!=='Chaudron du soir')return;
    fill(byId('questionPreset'),eveningQuestions);
    fill(byId('finalPreset'),eveningFinals);
    byId('questionText').value=eveningQuestions[0];
    byId('finalText').value=eveningFinals[0];
    byId('intro').value='Prends quelques secondes pour déposer une part de ta journée, sans jugement.';
  });
}

function activeEntries(){return Object.entries(moments).filter(([,m])=>!m.archived).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0))}
function safe(text=''){const node=document.createElement('div');node.textContent=text;return node.innerHTML}
function versionOf(moment){return String(moment.productVersion||moment.version||'ancienne')}
function isCurrent(moment){return versionOf(moment)===CURRENT_VERSION}
function momentUrl(id){return `${location.origin}${location.pathname.replace(/admin\.html$/,'')}?m=${id}`}

async function copyLink(id,button){
  await navigator.clipboard.writeText(momentUrl(id));
  if(button){const old=button.textContent;button.textContent='✓ Lien copié';setTimeout(()=>button.textContent=old,1800)}
}

async function shareMoment(id,moment,button){
  const url=momentUrl(id);
  const data={title:moment.title||'Toujours Reliés',text:'Tu es invité(e) à participer à un moment Toujours Reliés.',url};
  try{
    if(navigator.share){await navigator.share(data);return}
    await copyLink(id,button);
  }catch(error){
    if(error?.name!=='AbortError'){console.error(error);await copyLink(id,button)}
  }
}

function installVersionSummary(){
  const appRoot=byId('adminApp');
  if(!appRoot)return;
  let card=byId('versionSummary');
  if(!card){
    card=document.createElement('section');card.id='versionSummary';card.className='card';
    const hero=appRoot.querySelector('.admin-hero');hero?.insertAdjacentElement('afterend',card);
  }
  card.innerHTML=`<div class="section-title-row"><div><p class="eyebrow">VERSION DU PROJET</p><h2>Toujours Reliés V${CURRENT_VERSION}</h2></div><span class="status-pill open">Édition fondatrice</span></div><p class="muted">Partage mobile, raccourci du dernier moment, navigation Story, lecture intelligente, Chaudron du soir et durée modifiable.</p><div id="latestMomentShortcut"></div><div id="versionStatus"></div>`;
}

function renderLatestShortcut(){
  const box=byId('latestMomentShortcut');if(!box)return;
  const latest=activeEntries()[0];
  if(!latest){box.innerHTML='<p class="muted">Aucun moment disponible pour le moment.</p>';return}
  const [id,moment]=latest;
  box.innerHTML=`<article class="dashboard-card" style="margin-top:14px"><p class="eyebrow">📌 DERNIER MOMENT CRÉÉ</p><h3>${safe(moment.title||'Moment sans titre')}</h3><p class="muted">${safe(moment.theme||'Libre')} · ${moment.forceFinal||Date.now()>=Number(moment.endsAt||0)?'Terminé':'Ouvert'}</p><div class="action-grid primary-actions"><button type="button" class="primary latest-share">📤 Partager</button><button type="button" class="secondary latest-copy">📋 Copier le lien</button><a class="secondary" target="_blank" href="${momentUrl(id)}">👁 Ouvrir</a></div></article>`;
  box.querySelector('.latest-share').addEventListener('click',event=>shareMoment(id,moment,event.currentTarget));
  box.querySelector('.latest-copy').addEventListener('click',event=>copyLink(id,event.currentTarget));
}

function decorateCards(){
  installEveningTheme();installVersionSummary();renderLatestShortcut();
  const cards=[...document.querySelectorAll('#momentsList .moment-admin')];
  const entries=activeEntries();
  cards.forEach((card,index)=>{
    const entry=entries[index];if(!entry)return;
    const [id,moment]=entry;
    let versionLine=card.querySelector('.moment-version-v3');
    if(!versionLine){versionLine=document.createElement('p');versionLine.className='muted moment-version-v3';card.querySelector('.moment-top > div')?.appendChild(versionLine)}
    versionLine.textContent=isCurrent(moment)?`✓ Version V${CURRENT_VERSION}`:`Version ${versionOf(moment)} · mise à niveau disponible`;
    const area=card.querySelector('.primary-actions');if(!area)return;
    if(!card.querySelector('.share-v32')){
      const share=document.createElement('button');share.type='button';share.className='primary share-v32';share.textContent='📤 Partager';share.addEventListener('click',event=>shareMoment(id,moment,event.currentTarget));area.insertBefore(share,area.firstChild);
    }
    if(!isCurrent(moment)&&!card.querySelector('.upgrade-v3')){
      const upgrade=document.createElement('button');upgrade.type='button';upgrade.className='secondary upgrade-v3';upgrade.textContent='⬆️ Mettre à niveau';upgrade.addEventListener('click',()=>upgradeMoment(id,moment));area.appendChild(upgrade);
    }
    if(!moment.forceFinal&&Date.now()<Number(moment.endsAt||0)&&!card.querySelector('.extend-v3')){
      const extend=document.createElement('button');extend.type='button';extend.className='secondary extend-v3';extend.textContent='⏰ Prolonger';extend.addEventListener('click',()=>openExtend(id,moment));area.appendChild(extend);
    }
  });
}

async function upgradeMoment(id,moment){
  if(!confirm(`Mettre « ${moment.title||'ce moment'} » à niveau vers la V${CURRENT_VERSION} ?\n\nLes messages, les participants et le lien seront conservés.`))return;
  const patch={productVersion:CURRENT_VERSION,animationType:'cauldron',storyNavigation:true,readingMode:'dynamic',esteemText:'Tu es unique. Tu as de la valeur.',mobileShare:true,upgradedAt:Date.now()};
  const final=String(moment.finalText||'');
  if(!final||/morceau de (votre|la) journée/i.test(final))patch.finalText='Merci d’avoir partagé un morceau de toi.';
  try{await update(ref(db,`moments/${id}`),patch);byId('versionStatus').textContent='Moment mis à niveau sans perte de données.'}
  catch(error){console.error(error);alert('La mise à niveau a échoué. Réessaie dans un instant.')}
}

function dateValue(ms){const d=new Date(ms),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
function openExtend(id,moment){
  const modal=byId('adminModal'),content=byId('modalContent');if(!modal||!content)return;
  content.innerHTML=`<p class="eyebrow">PROLONGER LE MOMENT</p><h2>${safe(moment.title||'Moment')}</h2><p>Fin actuelle : <strong>${new Date(moment.endsAt).toLocaleString('fr-FR')}</strong></p><div class="action-grid"><button data-add="1">+1 h</button><button data-add="3">+3 h</button><button data-add="6">+6 h</button><button data-add="12">+12 h</button><button data-add="24">+24 h</button><button data-add="48">+48 h</button></div><label>Nouvelle date et heure de fin<input id="v3End" type="datetime-local" value="${dateValue(moment.endsAt)}"></label><button id="v3Save" class="primary big" type="button">Enregistrer</button><p id="v3Status"></p>`;
  modal.classList.remove('hidden');let chosen=Number(moment.endsAt);
  content.querySelectorAll('[data-add]').forEach(button=>button.addEventListener('click',()=>{chosen=Math.max(Date.now(),Number(moment.endsAt||Date.now()))+Number(button.dataset.add)*3600000;byId('v3End').value=dateValue(chosen)}));
  byId('v3End').addEventListener('change',()=>{chosen=new Date(byId('v3End').value).getTime()});
  byId('v3Save').addEventListener('click',async()=>{
    const end=chosen||new Date(byId('v3End').value).getTime();if(!Number.isFinite(end)||end<=Date.now()){byId('v3Status').textContent='Choisis une date située dans le futur.';return}
    const button=byId('v3Save');button.disabled=true;button.textContent='Enregistrement…';
    try{await update(ref(db,`moments/${id}`),{endsAt:end,extendedAt:Date.now()});byId('v3Status').textContent='Le moment est prolongé. Le lien reste identique.';setTimeout(()=>modal.classList.add('hidden'),1200)}
    catch(error){console.error(error);byId('v3Status').textContent='La modification a échoué.';button.disabled=false;button.textContent='Enregistrer'}
  });
}

function tagNewestCreatedMoment(){
  const recent=Object.entries(moments).filter(([,m])=>!m.productVersion&&Date.now()-Number(m.createdAt||0)<20000).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0))[0];
  if(recent)update(ref(db,`moments/${recent[0]}`),{productVersion:CURRENT_VERSION,storyNavigation:true,readingMode:'dynamic',mobileShare:true}).catch(console.error);
}

byId('momentForm')?.addEventListener('submit',()=>setTimeout(tagNewestCreatedMoment,1400));
onValue(ref(db,'moments'),snapshot=>{moments=snapshot.val()||{};setTimeout(decorateCards,180)});
installEveningTheme();installVersionSummary();
setInterval(decorateCards,2500);
