import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, get, update } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app=getApps()[0]||initializeApp(firebaseConfig),db=getDatabase(app);
const $=id=>document.getElementById(id);

function momentIdFromCard(card){
  const link=card.querySelector('a[href*="?m="]');
  if(!link)return null;
  return new URL(link.href,location.href).searchParams.get('m');
}

function addButtons(){
  document.querySelectorAll('.moment-admin').forEach(card=>{
    if(card.querySelector('.messageVisibility'))return;
    const actions=card.querySelector('.more-actions .action-grid');
    if(!actions)return;
    const button=document.createElement('button');
    button.type='button';
    button.className='secondary messageVisibility';
    button.textContent='👁 Visibilité des messages';
    button.onclick=()=>openVisibility(card);
    actions.prepend(button);
  });
}

async function openVisibility(card){
  const id=momentIdFromCard(card);if(!id)return;
  const snap=await get(ref(db,`moments/${id}`));
  const moment=snap.val()||{};
  const current=moment.messageVisibility==='hidden'?'hidden':'visible';
  $('modalContent').innerHTML=`
    <p class="eyebrow">CONFIDENTIALITÉ</p>
    <h2>Visibilité des messages</h2>
    <p class="notice">Ce choix modifie à la fois ce que les participants voient et le texte présenté dans l’invitation.</p>
    <form id="visibilityForm">
      <label>Avant la cérémonie
        <select id="messageVisibility">
          <option value="visible" ${current==='visible'?'selected':''}>Messages visibles au fur et à mesure</option>
          <option value="hidden" ${current==='hidden'?'selected':''}>Messages cachés jusqu’à la cérémonie</option>
        </select>
      </label>
      <p id="visibilityHelp" class="notice"></p>
      <button class="primary big" type="submit">Enregistrer</button>
    </form>`;
  $('adminModal').classList.remove('hidden');
  const updateHelp=()=>{$('visibilityHelp').textContent=$('messageVisibility').value==='hidden'?'Les participants verront uniquement leur propre confirmation. Les messages des autres resteront cachés jusqu’à la cérémonie.':'Les messages seront visibles par tous au fil des participations.'};
  $('messageVisibility').onchange=updateHelp;updateHelp();
  $('visibilityForm').onsubmit=async e=>{
    e.preventDefault();const btn=e.submitter;btn.disabled=true;btn.textContent='Enregistrement…';
    await update(ref(db,`moments/${id}`),{messageVisibility:$('messageVisibility').value,updatedAt:Date.now()});
    $('adminModal').classList.add('hidden');$('modalContent').innerHTML='';
  };
}

new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true});
addButtons();