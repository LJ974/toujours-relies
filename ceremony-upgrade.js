import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const params=new URLSearchParams(location.search),momentId=params.get('m');
const app=getApps()[0]||initializeApp(firebaseConfig),db=getDatabase(app);
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms));
let running=false;

function clearParticles(){$('particles').innerHTML=''}
function makeEmber(index=0){
  const root=$('particles'),p=document.createElement('span');
  p.className=`real-particle ${index%3===0?'ember ember-gold':'ember'}`;
  const angle=(-Math.PI*.85)+(Math.random()*Math.PI*.7),distance=120+Math.random()*430;
  p.style.left='50%';p.style.top='50%';
  p.style.setProperty('--x',`${Math.cos(angle)*distance}px`);
  p.style.setProperty('--y',`${Math.sin(angle)*distance-60}px`);
  p.style.setProperty('--r',`${Math.random()*520-260}deg`);
  p.style.animationDelay=`${Math.random()*.5}s`;
  p.style.animationDuration=`${3.2+Math.random()*2}s`;
  root.appendChild(p);setTimeout(()=>p.remove(),5600)
}
function emberWave(count=24){for(let i=0;i<count;i++)setTimeout(()=>makeEmber(i),i*55)}
function showCauldron(){
  $('cauldron').classList.remove('hidden');
  $('book').classList.add('hidden');
  $('ceremony').dataset.animation='cauldron';
}
async function intro(text){
  showCauldron();clearParticles();
  text.textContent='Le chaudron recueille chaque mot…';
  await sleep(1000);
  $('cauldron').classList.add('awake');
  emberWave(34);
  await sleep(2700);
  text.classList.add('fade-out');await sleep(520);text.textContent='';text.classList.remove('fade-out');await sleep(320)
}
async function readData(){
  const [mSnap,msgSnap]=await Promise.all([get(ref(db,`moments/${momentId}`)),get(ref(db,`messages/${momentId}`))]);
  return{moment:mSnap.val()||{},items:Object.values(msgSnap.val()||{}).filter(x=>x&&!x.deleted)}
}
async function play(){
  if(running||!momentId)return;running=true;
  const ceremony=$('ceremony'),text=$('ceremonyText');
  ceremony.classList.remove('hidden');$('replay').classList.add('hidden');$('closeCeremony').classList.add('hidden');text.className='ceremonyText';
  try{
    const {moment,items}=await readData();await intro(text);
    if(!items.length){
      text.textContent='Même sans mot déposé, ce moment rappelle que le lien existe.';
      text.classList.add('message-reveal');await sleep(4200)
    }else{
      const longest=Math.max(...items.map(x=>(x.text||'').length));
      const per=Math.max(3800,Math.min(6000,3100+longest*11));
      for(const item of items){
        text.classList.remove('message-reveal');text.classList.add('fade-out');await sleep(420);
        text.textContent=`${item.anonymous?'Anonyme':item.name||'Anonyme'}\n\n${item.text||''}`;
        text.classList.remove('fade-out');text.classList.add('message-reveal');emberWave(10);await sleep(per)
      }
    }
    text.classList.add('fade-out');await sleep(560);text.textContent='';clearParticles();emberWave(46);await sleep(1700);
    $('cauldron').classList.add('final-glow');
    text.textContent=moment.finalText||'Merci d’avoir apporté ta contribution à ce moment. Ensemble, vous l’avez rendu unique.';
    text.classList.remove('fade-out');text.classList.add('final-reveal');await sleep(6500)
  }catch(e){console.error(e);text.textContent='La cérémonie n’a pas pu se charger. Réessaie dans un instant.'}
  finally{running=false;$('replay').classList.remove('hidden');$('closeCeremony').classList.remove('hidden');$('cauldron').classList.remove('awake','final-glow')}
}

document.addEventListener('click',e=>{const id=e.target?.id;if(id==='playFinal'||id==='replay'){e.preventDefault();e.stopImmediatePropagation();play()}},true);
$('closeCeremony')?.addEventListener('click',e=>{if(!running){e.preventDefault();e.stopImmediatePropagation();$('ceremony').classList.add('hidden');clearParticles()}},true);
