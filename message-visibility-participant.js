import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const params=new URLSearchParams(location.search),momentId=params.get('m');
const app=getApps()[0]||initializeApp(firebaseConfig),db=getDatabase(app);
const messagesCard=document.getElementById('messagesCard');
const invitationHelp=document.querySelector('.invitation-help');
let hiddenMode=false,closed=false;

function applyVisibility(){
  if(messagesCard)messagesCard.classList.toggle('hidden',hiddenMode&&!closed);
  if(invitationHelp){
    invitationHelp.textContent=hiddenMode
      ? 'Dépose simplement une pensée, une émotion, une petite victoire, une difficulté ou un signe de vie. Les contributions resteront cachées jusqu’à la cérémonie finale, où elles seront révélées ensemble.'
      : 'Dépose simplement une pensée, une émotion, une petite victoire, une difficulté ou un signe de vie. Les messages seront visibles au fil des participations, puis mis en lumière lors de la cérémonie finale.';
  }
}

if(momentId){
  onValue(ref(db,`moments/${momentId}`),snapshot=>{
    const moment=snapshot.val()||{};
    hiddenMode=moment.messageVisibility==='hidden';
    closed=Boolean(moment.forceFinal||Date.now()>=Number(moment.endsAt||0));
    applyVisibility();
  });
  if(messagesCard)new MutationObserver(applyVisibility).observe(messagesCard,{attributes:true,attributeFilter:['class']});
}
