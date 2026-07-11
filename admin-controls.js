import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app=getApps()[0]||initializeApp(firebaseConfig);
const db=getDatabase(app);
let moments={},messages={};

onValue(ref(db,'moments'),s=>{moments=s.val()||{};decorate()});
onValue(ref(db,'messages'),s=>{messages=s.val()||{};decorate()});

function momentEntries(){return Object.entries(moments).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0))}
function momentUrl(id){return `${location.origin}${location.pathname.replace(/admin\.html$/,'')}?m=${id}`}

function decorate(){
  const cards=[...document.querySelectorAll('.moment-admin')];
  const entries=momentEntries();
  cards.forEach((card,index)=>{
    const entry=entries[index];if(!entry||card.querySelector('.full-admin-actions'))return;
    const [id,m]=entry;
    const bar=document.createElement('div');bar.className='row full-admin-actions';
    bar.innerHTML=`<button class="primary copy-full">Copier le lien</button><a class="secondary" target="_blank" href="${momentUrl(id)}">Ouvrir</a><button class="secondary edit-full">Modifier</button><a class="secondary" target="_blank" href="${momentUrl(id)}#messagesCard">Voir les phrases</a><button class="secondary reopen-full">Rouvrir</button><button class="danger reset-full">Réinitialiser</button><button class="danger delete-full">Supprimer</button>`;
    const old=card.querySelector('.row');if(old)old.replaceWith(bar);else card.appendChild(bar);
    bar.querySelector('.copy-full').onclick=()=>navigator.clipboard.writeText(momentUrl(id));
    bar.querySelector('.edit-full').onclick=()=>editMoment(id,m);
    bar.querySelector('.reopen-full').onclick=()=>reopenMoment(id,m);
    bar.querySelector('.reset-full').onclick=()=>resetMoment(id,m);
    bar.querySelector('.delete-full').onclick=()=>deleteMoment(id);
  });
}

async function editMoment(id,m){
  const title=prompt('Titre du moment :',m.title||'');if(title===null)return;
  const intro=prompt('Texte d’introduction :',m.intro||'');if(intro===null)return;
  const target=prompt('Nombre de participants prévus :',m.target||1);if(target===null)return;
  const finalText=prompt('Phrase finale :',m.finalText||'');if(finalText===null)return;
  if(!confirm('Enregistrer les modifications de ce moment en cours ?'))return;
  await update(ref(db,`moments/${id}`),{title:title.trim()||m.title,intro:intro.trim(),target:Math.max(1,Number(target)||1),finalText:finalText.trim(),updatedAt:Date.now()});
}

async function reopenMoment(id,m){
  const hours=prompt('Pendant combien d’heures veux-tu rouvrir ce moment ?',m.durationHours||24);if(hours===null)return;
  const durationHours=Math.max(1,Number(hours)||24);
  if(!confirm(`Rouvrir le moment pendant ${durationHours} heure(s) ?`))return;
  await update(ref(db,`moments/${id}`),{durationHours,startsAt:Date.now(),endsAt:Date.now()+durationHours*3600000,forceFinal:false,reopenedAt:Date.now()});
}

async function resetMoment(id,m){
  if(!confirm('Réinitialiser ce moment ? Toutes les phrases seront supprimées et le délai redémarrera.'))return;
  const durationHours=Math.max(1,Number(m.durationHours)||24);
  await remove(ref(db,`messages/${id}`));
  await update(ref(db,`moments/${id}`),{startsAt:Date.now(),endsAt:Date.now()+durationHours*3600000,forceFinal:false,resetAt:Date.now()});
}

async function deleteMoment(id){
  if(!confirm('Supprimer ce moment et toutes ses phrases ?'))return;
  await remove(ref(db,`messages/${id}`));
  await remove(ref(db,`moments/${id}`));
}

new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});