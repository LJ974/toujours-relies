import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const params=new URLSearchParams(location.search),momentId=params.get('m');
const app=getApps()[0]||initializeApp(firebaseConfig),db=getDatabase(app);
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms));
let running=false,storyActive=false,paused=false,command=null,wake=null,currentIndex=0,currentDuration=0,currentStarted=0,remaining=0;

const ritualTexts={
  deposit:{
    opening1:'Aujourd’hui, chacun est venu déposer une part de soi…',
    opening2:'Des instants légers, ordinaires ou plus difficiles.',
    opening3:'Ici, chaque émotion peut trouver sa place.',
    collective:'Vos journées étaient différentes…\n\nmais une part de chacun s’est retrouvée ici.',
    closing:'Ce moment s’achève.\n\nCe qui était léger peut continuer de briller.\nCe qui était lourd a trouvé un endroit où se poser.',
    signature:'Toujours Reliés',
    esteem:'Tu es unique. Tu as de la valeur.'
  },
  transmit:{
    opening1:'Aujourd’hui, plusieurs personnes ont choisi de partager quelques mots…',
    opening2:'Des mots différents, offerts simplement et librement.',
    opening3:'Découvrons ensemble ce que chacun a souhaité transmettre.',
    collective:'Sans se concerter…\n\nvos mots se sont retrouvés dans un même moment.',
    closing:'Ce moment s’achève.\n\nLes mots partagés peuvent continuer leur chemin bien après cette cérémonie.',
    signature:'Toujours Reliés',
    esteem:'Tu es unique. Tu as de la valeur.'
  },
  memories:{
    opening1:'Certains souvenirs traversent le temps sans perdre leur éclat…',
    opening2:'Aujourd’hui, chacun en a confié un fragment.',
    opening3:'Découvrons ensemble ces instants restés en mémoire.',
    collective:'Des souvenirs différents…\n\nréunis le temps d’un même moment.',
    closing:'Ce moment s’achève.\n\nLes souvenirs continuent de vivre lorsqu’ils sont partagés.',
    signature:'Toujours Reliés',
    esteem:'Tu es unique. Tu as de la valeur.'
  }
};

function ritualFor(moment={}){
  const theme=String(moment.theme||'').toLowerCase();
  const question=String(moment.questionText||moment.intro||'').toLowerCase();
  const title=String(moment.title||'').toLowerCase();
  const combined=`${theme} ${question} ${title}`;
  if(/souvenir|mémoire|moment partagé|revivre/.test(combined))return 'memories';
  if(/message|quelques mots|quels mots|partager|transmettre|offrir|laisser à une personne/.test(combined))return 'transmit';
  return 'deposit';
}

function ensureFlames(){const c=$('cauldron');if(!c||c.querySelector('.flame-field'))return;const field=document.createElement('div');field.className='flame-field';for(let i=0;i<7;i++){const f=document.createElement('span');f.className=`real-flame flame-${i+1}`;field.appendChild(f)}const glow=document.createElement('div');glow.className='cauldron-aura';c.appendChild(glow);c.appendChild(field)}
function clearParticles(){$('particles').innerHTML=''}
function addParticle(kind='ember',slow=false){const p=document.createElement('span');p.className=`cinematic-particle ${kind}`;p.style.left=`${8+Math.random()*84}%`;p.style.top=slow?`${8+Math.random()*65}%`:'58%';p.style.setProperty('--dx',`${-170+Math.random()*340}px`);p.style.setProperty('--dy',`${slow?-130-Math.random()*250:-220-Math.random()*420}px`);p.style.setProperty('--rot',`${-540+Math.random()*1080}deg`);p.style.setProperty('--scale',`${.55+Math.random()*1.25}`);p.style.animationDuration=`${slow?5+Math.random()*3.5:2.6+Math.random()*2}s`;p.style.animationDelay=`${Math.random()*.6}s`;$('particles').appendChild(p);setTimeout(()=>p.remove(),9500)}
function shower(kind,count,slow=false){for(let i=0;i<count;i++)setTimeout(()=>addParticle(kind,slow),i*(slow?85:32))}
function intensity(level){const c=$('cauldron');c.classList.remove('power-1','power-2','power-3','power-4','react-left','react-right','finale','calm');c.classList.add(`power-${Math.min(4,Math.max(1,level))}`)}
async function react(index,total){const c=$('cauldron');c.classList.remove('react-left','react-right');void c.offsetWidth;c.classList.add(index%2?'react-left':'react-right');const ratio=(index+1)/Math.max(1,total);intensity(1+Math.floor(ratio*3));shower(index%3===0?'spark':'ember',8+Math.floor(ratio*10));await sleep(520)}
async function readData(){const [mSnap,msgSnap]=await Promise.all([get(ref(db,`moments/${momentId}`)),get(ref(db,`messages/${momentId}`))]);return{moment:mSnap.val()||{},items:Object.values(msgSnap.val()||{}).filter(x=>x&&!x.deleted)}}
function label(item){return item.anonymous?'Anonyme':item.name||'Anonyme'}
function buildSlides(items){return items.map(item=>({text:`${item.emotion||'✨'}  ${label(item)}\n\n${item.text||''}`,length:(item.text||'').length}))}
function slideDuration(slide){return Math.round(Math.max(6000,Math.min(15000,6000+slide.length*50)))}
async function showLine(text,line,duration,className='narrative-line'){text.classList.add('fade-out');await sleep(420);text.textContent=line;text.className=`ceremonyText ${className}`;await sleep(duration)}
async function intro(text,t){ensureFlames();clearParticles();$('book')?.classList.add('hidden');$('cauldron').classList.remove('hidden');$('ceremony').dataset.animation='cauldron';intensity(1);text.textContent=t.opening1;text.className='ceremonyText narrative-line';shower('ember',16,true);await sleep(3200);await showLine(text,t.opening2,2800);$('cauldron').classList.add('awake');await showLine(text,t.opening3,3200,'narrative-line emphasis-soft');text.classList.add('fade-out');await sleep(500);text.textContent='';text.className='ceremonyText';await sleep(350)}
async function absorbMessage(text){text.classList.remove('message-reveal');text.classList.add('absorbing');shower('spark',14,true);await sleep(1050);text.textContent='';text.className='ceremonyText';await sleep(480)}
function resolvedFinal(value='',ritual='deposit'){const clean=String(value).trim();if(clean&&!/morceau de (votre|la) journée/i.test(clean))return clean;if(ritual==='transmit')return 'Des mots différents… une même envie de partager. Merci d’avoir apporté les tiens.';if(ritual==='memories')return 'Les souvenirs vivent lorsqu’ils sont partagés. Merci d’avoir confié le tien.';return 'Merci d’avoir partagé un morceau de toi.'}
async function typewriter(text,line,speed=72){text.textContent='';text.className='ceremonyText typewriter-line';for(const char of line){text.textContent+=char;await sleep(char==='.'?360:char===','?190:speed)}await sleep(2900)}
async function finalSequence(text,customFinal,t,ritual){storyActive=false;hideStoryUi();const c=$('cauldron');c.classList.remove('power-1','power-2','power-3','power-4');c.classList.add('finale');text.classList.add('fade-out');await sleep(520);text.textContent='';shower('ember',32);await sleep(900);await showLine(text,t.collective,3400,'final-step collective-line');await showLine(text,resolvedFinal(customFinal,ritual),3900,'final-step grand-final-message');text.classList.add('fade-out');await sleep(700);text.textContent='';await sleep(1800);await typewriter(text,t.esteem);c.classList.add('bursting');shower('star',48,true);shower('confetti',44,true);await sleep(1100);await showLine(text,t.signature,2800,'grand-final');text.classList.add('fade-out');await sleep(500);text.textContent='';c.classList.remove('finale','bursting');c.classList.add('calm');await sleep(850);text.textContent=t.closing;text.className='ceremonyText closing-line';shower('last-spark',1,true);await sleep(4800)}

function ensureStoryUi(total){let ui=$('storyUi');if(!ui){ui=document.createElement('div');ui.id='storyUi';ui.className='story-ui hidden';ui.innerHTML='<div id="storyBars" class="story-bars"></div><div id="storyHint" class="story-hint">Touchez à droite pour avancer · à gauche pour revenir</div><div id="pauseHint" class="pause-hint hidden">Pause</div>';$('ceremony').appendChild(ui)}const bars=$('storyBars');bars.innerHTML='';for(let i=0;i<total;i++){const seg=document.createElement('span');seg.className='story-segment';seg.innerHTML='<i></i>';bars.appendChild(seg)}ui.classList.remove('hidden');$('storyHint').classList.remove('hidden');setTimeout(()=>$('storyHint')?.classList.add('hidden'),3200)}
function hideStoryUi(){$('storyUi')?.classList.add('hidden')}
function updateStoryBars(index,ratio=0){document.querySelectorAll('.story-segment').forEach((seg,i)=>{const fill=seg.firstElementChild;fill.style.transition='none';fill.style.width=i<index?'100%':i>index?'0%':`${Math.max(0,Math.min(1,ratio))*100}%`})}
function signal(next){if(!storyActive)return;command=next;if(wake)wake()}
async function interactiveWait(duration,index){currentDuration=duration;remaining=duration;currentStarted=performance.now();command=null;updateStoryBars(index,0);while(remaining>0){if(paused){await new Promise(r=>{wake=r});wake=null;currentStarted=performance.now();continue}const chunk=Math.min(80,remaining);await Promise.race([sleep(chunk),new Promise(r=>{wake=r})]);wake=null;if(command)return command;const elapsed=performance.now()-currentStarted;remaining=Math.max(0,duration-elapsed);updateStoryBars(index,1-remaining/duration)}updateStoryBars(index,1);return 'next'}

let pressTimer=null,pressStarted=false;
function pointerDown(){if(!storyActive)return;pressStarted=false;pressTimer=setTimeout(()=>{pressStarted=true;paused=true;$('pauseHint')?.classList.remove('hidden');if(wake)wake()},420)}
function pointerUp(e){if(!storyActive)return;clearTimeout(pressTimer);if(pressStarted){paused=false;$('pauseHint')?.classList.add('hidden');if(wake)wake();return}const x=e.clientX??e.changedTouches?.[0]?.clientX??innerWidth;signal(x<innerWidth*.35?'prev':'next')}
function installStoryControls(){const c=$('ceremony');c.addEventListener('pointerdown',pointerDown);c.addEventListener('pointerup',pointerUp);c.addEventListener('pointercancel',()=>clearTimeout(pressTimer))}
installStoryControls();

async function play(){if(running||!momentId)return;running=true;const ceremony=$('ceremony'),text=$('ceremonyText');ceremony.classList.remove('hidden');ceremony.classList.add('cinematic-cauldron');$('replay').classList.add('hidden');$('closeCeremony').classList.add('hidden');text.className='ceremonyText';try{const {moment,items}=await readData(),slides=buildSlides(items),ritual=ritualFor(moment),t={...ritualTexts[ritual],...(moment.ceremonyTexts||{})};await intro(text,t);if(!slides.length){text.textContent='Même sans mot déposé, ce moment rappelle que le lien existe.';text.classList.add('message-reveal');await sleep(6000);await absorbMessage(text)}else{storyActive=true;ensureStoryUi(slides.length);currentIndex=0;while(currentIndex<slides.length){const slide=slides[currentIndex];await react(currentIndex,slides.length);text.textContent=slide.text;text.className='ceremonyText message-reveal message-card';const action=await interactiveWait(slideDuration(slide),currentIndex);await absorbMessage(text);if(action==='prev')currentIndex=Math.max(0,currentIndex-1);else currentIndex++}}await sleep(1800);await finalSequence(text,moment.finalText,t,ritual)}catch(e){console.error(e);text.textContent='La cérémonie n’a pas pu se charger. Réessaie dans un instant.'}finally{running=false;storyActive=false;paused=false;hideStoryUi();$('replay').classList.remove('hidden');$('closeCeremony').classList.remove('hidden');$('cauldron').classList.remove('awake','power-1','power-2','power-3','power-4','react-left','react-right','finale','bursting','calm')}}
document.addEventListener('click',e=>{const id=e.target?.id;if(id==='playFinal'||id==='replay'){e.preventDefault();e.stopImmediatePropagation();play()}},true);
$('closeCeremony')?.addEventListener('click',e=>{if(!running){e.preventDefault();e.stopImmediatePropagation();$('ceremony').classList.add('hidden');clearParticles()}},true);
