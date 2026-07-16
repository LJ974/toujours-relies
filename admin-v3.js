import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, onValue, update } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app=getApps()[0]||initializeApp(firebaseConfig);
const db=getDatabase(app);
const byId=id=>document.getElementById(id);
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
function decorateCards(){
  installEveningTheme();
  const cards=[...document.querySelectorAll('#momentsList .moment-admin')];
  const entries=activeEntries();
  cards.forEach((card,index)=>{
    const entry=entries[index];
    if(!entry||card.querySelector('.extend-v3'))return;
    const [id,moment]=entry;
    if(moment.forceFinal||Date.now()>=Number(moment.endsAt||0))return;
    const area=card.querySelector('.primary-actions');
    if(!area)return;
    const button=document.createElement('button');
    button.type='button';button.className='secondary extend-v3';button.textContent='⏰ Prolonger';
    button.addEventListener('click',()=>openExtend(id,moment));
    area.appendChild(button);
  });
}

function dateValue(ms){const d=new Date(ms),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
function safe(text=''){const node=document.createElement('div');node.textContent=text;return node.innerHTML}
function openExtend(id,moment){
  const modal=byId('adminModal'),content=byId('modalContent');
  if(!modal||!content)return;
  content.innerHTML=`<p class="eyebrow">PROLONGER LE MOMENT</p><h2>${safe(moment.title||'Moment')}</h2><p>Fin actuelle : <strong>${new Date(moment.endsAt).toLocaleString('fr-FR')}</strong></p><div class="action-grid"><button data-add="1">+1 h</button><button data-add="3">+3 h</button><button data-add="6">+6 h</button><button data-add="12">+12 h</button><button data-add="24">+24 h</button><button data-add="48">+48 h</button></div><label>Nouvelle date et heure de fin<input id="v3End" type="datetime-local" value="${dateValue(moment.endsAt)}"></label><button id="v3Save" class="primary big" type="button">Enregistrer</button><p id="v3Status"></p>`;
  modal.classList.remove('hidden');
  let chosen=Number(moment.endsAt);
  content.querySelectorAll('[data-add]').forEach(button=>button.addEventListener('click',()=>{
    chosen=Math.max(Date.now(),Number(moment.endsAt||Date.now()))+Number(button.dataset.add)*3600000;
    byId('v3End').value=dateValue(chosen);
  }));
  byId('v3End').addEventListener('change',()=>{chosen=new Date(byId('v3End').value).getTime()});
  byId('v3Save').addEventListener('click',async()=>{
    const end=chosen||new Date(byId('v3End').value).getTime();
    if(!Number.isFinite(end)||end<=Date.now()){byId('v3Status').textContent='Choisis une date située dans le futur.';return}
    const button=byId('v3Save');button.disabled=true;button.textContent='Enregistrement…';
    try{
      await update(ref(db,`moments/${id}`),{endsAt:end,extendedAt:Date.now()});
      byId('v3Status').textContent='Le moment est prolongé. Le lien et le compte à rebours restent identiques.';
      setTimeout(()=>modal.classList.add('hidden'),1200);
    }catch(error){console.error(error);byId('v3Status').textContent='La modification a échoué.';button.disabled=false;button.textContent='Enregistrer'}
  });
}

onValue(ref(db,'moments'),snapshot=>{moments=snapshot.val()||{};setTimeout(decorateCards,120)});
installEveningTheme();
setInterval(decorateCards,1500);