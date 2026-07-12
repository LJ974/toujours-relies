import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const params=new URLSearchParams(location.search),momentId=params.get('m');
const app=getApps()[0]||initializeApp(firebaseConfig),db=getDatabase(app);
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms));
let running=false,petalTimer=null;

function clearParticles(){clearInterval(petalTimer);petalTimer=null;$('particles').innerHTML=''}
function particleClass(type,i){if(type==='petals')return i%3===0?'petal petal-pale':'petal';if(type==='fireworks')return i%3===0?'spark spark-gold':'spark';if(type==='cauldron')return i%3===0?'ember ember-gold':'ember';return i%4===0?'page-speck page-speck-gold':'page-speck'}
function makeParticle(type='book',origin='center',index=0){
  const root=$('particles'),p=document.createElement('span');p.className=`real-particle ${particleClass(type,index)}`;
  if(type==='petals'){
    p.style.left=`${Math.random()*100}%`;p.style.top='-12%';p.style.setProperty('--drift',`${-120+Math.random()*240}px`);p.style.setProperty('--sway',`${35+Math.random()*70}px`);p.style.setProperty('--r',`${260+Math.random()*520}deg`);p.style.setProperty('--fall',`${7.5+Math.random()*5}s`);p.style.animationDelay=`${Math.random()*1.2}s`;
  }else{
    const angle=Math.random()*Math.PI*2,distance=120+Math.random()*520,x=Math.cos(angle)*distance,y=Math.sin(angle)*distance;
    p.style.left=origin==='top'?`${10+Math.random()*80}%`:'50%';p.style.top=origin==='top'?'-5%':'50%';p.style.setProperty('--x',`${x}px`);p.style.setProperty('--y',`${origin==='top'?500+Math.random()*500:y}px`);p.style.setProperty('--r',`${Math.random()*720-360}deg`);p.style.animationDelay=`${Math.random()*.45}s`;p.style.animationDuration=`${2.8+Math.random()*1.8}s`;
  }
  root.appendChild(p);setTimeout(()=>p.remove(),type==='petals'?13500:5200)
}
function burst(type='book',count=30,origin='center'){for(let i=0;i<count;i++)makeParticle(type,origin,i)}
function startPetalRain(){
  clearParticles();
  for(let i=0;i<10;i++)setTimeout(()=>makeParticle('petals','top',i),i*420);
  let i=10;petalTimer=setInterval(()=>{makeParticle('petals','top',i++);if(Math.random()>.55)makeParticle('petals','top',i++)},620)
}
function showVisual(type){$('cauldron').classList.toggle('hidden',type!=='cauldron');$('book').classList.toggle('hidden',type==='cauldron');$('ceremony').dataset.animation=type}
async function intro(type,text){
  showVisual(type);clearParticles();
  if(type==='cauldron'){text.textContent='Quelque chose se prépare…';await sleep(900);$('cauldron').classList.add('awake');burst('cauldron',36);await sleep(2500)}
  else if(type==='petals'){text.textContent='Les mots se déposent doucement…';startPetalRain();await sleep(3200);$('book').classList.add('open')}
  else if(type==='fireworks'){text.textContent='Chaque mot apporte une lumière…';burst('fireworks',58);await sleep(2600);$('book').classList.add('open')}
  else{text.textContent='Le livre rassemble les mots déposés…';$('book').classList.add('open');burst('book',32);await sleep(2700)}
  text.classList.add('fade-out');await sleep(500);text.textContent='';text.classList.remove('fade-out');await sleep(300)
}
async function readData(){const [mSnap,msgSnap]=await Promise.all([get(ref(db,`moments/${momentId}`)),get(ref(db,`messages/${momentId}`))]);return{moment:mSnap.val()||{},items:Object.values(msgSnap.val()||{}).filter(x=>x&&!x.deleted)}}
function chosen(type){return type==='random'?['cauldron','book','fireworks','petals'][Math.floor(Math.random()*4)]:(type||'book')}
async function play(){
  if(running||!momentId)return;running=true;
  const ceremony=$('ceremony'),text=$('ceremonyText');ceremony.classList.remove('hidden');$('replay').classList.add('hidden');$('closeCeremony').classList.add('hidden');text.className='ceremonyText';
  try{
    const {moment,items}=await readData(),type=chosen(moment.animationType);await intro(type,text);
    if(!items.length){text.textContent='Même sans mot déposé, ce moment rappelle que le lien existe.';text.classList.add('message-reveal');await sleep(4200)}
    else{
      const longest=Math.max(...items.map(x=>(x.text||'').length));const per=Math.max(3600,Math.min(5800,3000+longest*11));
      for(const item of items){text.classList.remove('message-reveal');text.classList.add('fade-out');await sleep(380);text.textContent=`${item.anonymous?'Anonyme':item.name||'Anonyme'}\n\n${item.text||''}`;text.classList.remove('fade-out');text.classList.add('message-reveal');if(type!=='petals')burst(type,12);await sleep(per)}
    }
    text.classList.add('fade-out');await sleep(520);text.textContent='';if(type!=='petals'){clearParticles();burst(type,52)}await sleep(1500);
    $('book').classList.add('hidden');$('cauldron').classList.add('hidden');text.textContent=moment.finalText||'Merci d’avoir apporté ta contribution à ce moment. Ensemble, vous l’avez rendu unique.';text.classList.remove('fade-out');text.classList.add('final-reveal');await sleep(6200)
  }catch(e){console.error(e);text.textContent='La cérémonie n’a pas pu se charger. Réessaie dans un instant.'}
  finally{running=false;clearInterval(petalTimer);petalTimer=null;$('replay').classList.remove('hidden');$('closeCeremony').classList.remove('hidden');$('book').classList.remove('open');$('cauldron').classList.remove('awake')}
}

document.addEventListener('click',e=>{const id=e.target?.id;if(id==='playFinal'||id==='replay'){e.preventDefault();e.stopImmediatePropagation();play()}},true);
$('closeCeremony')?.addEventListener('click',e=>{if(!running){e.preventDefault();e.stopImmediatePropagation();$('ceremony').classList.add('hidden');clearParticles()}},true);