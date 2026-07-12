import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const params=new URLSearchParams(location.search),momentId=params.get('m');
const app=getApps()[0]||initializeApp(firebaseConfig),db=getDatabase(app);
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms));
let running=false;

function clearParticles(){$('particles').innerHTML=''}
function addParticle(kind='ember',slow=false){
  const p=document.createElement('span');p.className=`cinematic-particle ${kind}`;
  p.style.left=`${8+Math.random()*84}%`;p.style.top=slow?`${5+Math.random()*70}%`:'58%';
  p.style.setProperty('--dx',`${-160+Math.random()*320}px`);
  p.style.setProperty('--dy',`${slow?-140-Math.random()*260:-220-Math.random()*420}px`);
  p.style.setProperty('--rot',`${-540+Math.random()*1080}deg`);
  p.style.setProperty('--scale',`${.6+Math.random()*1.2}`);
  p.style.animationDuration=`${slow?4.8+Math.random()*3.5:2.5+Math.random()*2.2}s`;
  p.style.animationDelay=`${Math.random()*.7}s`;
  $('particles').appendChild(p);setTimeout(()=>p.remove(),9000)
}
function shower(kind,count,slow=false){for(let i=0;i<count;i++)setTimeout(()=>addParticle(kind,slow),i*(slow?75:28))}
function firework(x,y,delay=0){
  const root=$('particles');
  for(let i=0;i<18;i++){
    const p=document.createElement('span');p.className='cinematic-particle firework-ray';p.style.left=`${x}%`;p.style.top=`${y}%`;
    const angle=(Math.PI*2*i)/18,distance=70+Math.random()*120;
    p.style.setProperty('--dx',`${Math.cos(angle)*distance}px`);p.style.setProperty('--dy',`${Math.sin(angle)*distance}px`);p.style.animationDelay=`${delay}s`;p.style.animationDuration=`${3.3+Math.random()*1.2}s`;
    root.appendChild(p);setTimeout(()=>p.remove(),6500)
  }
}
function intensity(level){
  const c=$('cauldron');c.classList.remove('power-1','power-2','power-3','react-left','react-right','finale');c.classList.add(`power-${Math.min(3,Math.max(1,level))}`)
}
async function react(index){
  const c=$('cauldron');c.classList.remove('react-left','react-right');void c.offsetWidth;c.classList.add(index%2?'react-left':'react-right');
  shower(index%3===0?'spark':'ember',10,false);await sleep(420)
}
async function readData(){const [mSnap,msgSnap]=await Promise.all([get(ref(db,`moments/${momentId}`)),get(ref(db,`messages/${momentId}`))]);return{moment:mSnap.val()||{},items:Object.values(msgSnap.val()||{}).filter(x=>x&&!x.deleted)}}
async function intro(text){
  clearParticles();$('book').classList.add('hidden');$('cauldron').classList.remove('hidden');$('ceremony').dataset.animation='cauldron';
  intensity(1);text.textContent='Le chaudron s’éveille doucement…';shower('ember',24,true);await sleep(2500);
  $('cauldron').classList.add('awake');text.classList.add('fade-out');await sleep(450);text.textContent='';text.classList.remove('fade-out');await sleep(300)
}
async function finalSequence(text,finalText){
  const c=$('cauldron');c.classList.remove('power-1','power-2','power-3');c.classList.add('finale');
  text.classList.add('fade-out');await sleep(500);text.textContent='';
  shower('ember',45,false);shower('star',55,true);shower('confetti',70,true);
  firework(20,28,0);firework(78,22,.55);firework(50,16,1.05);firework(32,38,1.5);firework(68,42,1.9);
  await sleep(1800);text.textContent=finalText; text.classList.remove('fade-out');text.classList.add('final-reveal');await sleep(7600)
}
async function play(){
  if(running||!momentId)return;running=true;
  const ceremony=$('ceremony'),text=$('ceremonyText');ceremony.classList.remove('hidden');$('replay').classList.add('hidden');$('closeCeremony').classList.add('hidden');text.className='ceremonyText';
  try{
    const {moment,items}=await readData();await intro(text);
    if(!items.length){text.textContent='Même sans mot déposé, ce moment rappelle que le lien existe.';text.classList.add('message-reveal');await sleep(4300)}
    else{
      const per=Math.max(3900,Math.min(6200,3200+Math.max(...items.map(x=>(x.text||'').length))*12));
      for(let i=0;i<items.length;i++){
        const item=items[i],level=1+Math.floor((i/Math.max(1,items.length-1))*2);intensity(level);await react(i);
        text.classList.remove('message-reveal');text.classList.add('fade-out');await sleep(420);
        text.textContent=`${item.anonymous?'Anonyme':item.name||'Anonyme'}\n\n${item.text||''}`;
        text.classList.remove('fade-out');text.classList.add('message-reveal');await sleep(per)
      }
    }
    await finalSequence(text,moment.finalText||'Merci d’avoir rendu ce moment possible. ✨')
  }catch(e){console.error(e);text.textContent='La cérémonie n’a pas pu se charger. Réessaie dans un instant.'}
  finally{running=false;$('replay').classList.remove('hidden');$('closeCeremony').classList.remove('hidden');$('cauldron').classList.remove('awake','power-1','power-2','power-3','react-left','react-right','finale')}
}

document.addEventListener('click',e=>{const id=e.target?.id;if(id==='playFinal'||id==='replay'){e.preventDefault();e.stopImmediatePropagation();play()}},true);
$('closeCeremony')?.addEventListener('click',e=>{if(!running){e.preventDefault();e.stopImmediatePropagation();$('ceremony').classList.add('hidden');clearParticles()}},true);