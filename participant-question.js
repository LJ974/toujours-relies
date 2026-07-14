import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const params=new URLSearchParams(location.search),momentId=params.get('m');
if(momentId){
  const app=getApps()[0]||initializeApp(firebaseConfig),db=getDatabase(app);
  onValue(ref(db,`moments/${momentId}`),snapshot=>{
    const moment=snapshot.val(),question=document.getElementById('participantQuestion');
    if(!question||!moment)return;
    question.textContent=moment.questionText||'';
    question.classList.toggle('hidden',!moment.questionText);
  });
}
