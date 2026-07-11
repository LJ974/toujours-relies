import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, onValue, set, remove, update } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app=initializeApp(firebaseConfig), db=getDatabase(app);
const qs=new URLSearchParams(location.search), momentId=qs.get('m');
const deviceKey='tr_device_id';
let deviceId=localStorage.getItem(deviceKey);if(!deviceId){deviceId=crypto.randomUUID();localStorage.setItem(deviceKey,deviceId)}
const emotions=['😊 Heureux','🥰 Amoureux','😂 Mort de rire','😌 Apaisé','🤩 Fier','🙏 Reconnaissant','😴 Fatigué','🤒 Malade','😐 Sans émotion','😮‍💨 Blasé','😡 En colère','😢 Triste','😰 Stressé','🤯 Débordé','🥺 Ému','💙 Besoin de soutien','🌈 Plein d’espoir','✨ Petite victoire','🎉 Bonne nouvelle'];
const $=id=>document.getElementById(id); emotions.forEach(x=>$('emotion').add(new Option(x,x.split(' ')[0])));
let moment=null,messages={},myMessage=null,timer;
$('message').addEventListener('input',()=>{$('counter').textContent=`${$('message').value.length}/280`});

if(!momentId){$('emptyState').classList.remove('hidden')}else{
 onValue(ref(db,`moments/${momentId}`),snap=>{moment=snap.val();if(!moment){$('emptyState').classList.remove('hidden');return}renderMoment()});
 onValue(ref(db,`messages/${momentId}`),snap=>{messages=snap.val()||{};myMessage=messages[deviceId]||null;renderMessages();renderProgress();renderForm()});
}
function renderMoment(){
 $('momentTitle').textContent=moment.title;$('momentIntro').textContent=moment.intro;$('progressCard').classList.remove('hidden');$('messagesCard').classList.remove('hidden');
 clearInterval(timer);timer=setInterval(updateCountdown,1000);updateCountdown();
}
function isClosed(){return moment && (moment.forceFinal || Date.now()>=moment.endsAt)}
function updateCountdown(){if(!moment)return;const d=moment.endsAt-Date.now();if(isClosed()){$('countdown').textContent='Moment terminé ✨';$('participationCard').classList.add('hidden');$('finalCard').classList.remove('hidden');return}
 $('participationCard').classList.remove('hidden');const h=Math.floor(d/36e5),m=Math.floor((d%36e5)/6e4),s=Math.floor((d%6e4)/1000);$('countdown').textContent=`${h}h ${m}m ${s}s restantes`;}
function activeMessages(){return Object.entries(messages).filter(([,m])=>m && !m.deleted)}
function renderProgress(){if(!moment)return;const pct=Math.min(100,Math.round(activeMessages().length/Math.max(1,moment.target)*100));$('progressBar').style.width=pct+'%';$('progressText').textContent=pct+' %'}
function renderForm(){if(!moment||isClosed())return;if(myMessage&&!myMessage.deleted){$('messageForm').classList.add('hidden');$('myStatus').classList.remove('hidden');$('myStatus').innerHTML='<p class="notice">Ton message est validé. Tu peux uniquement le modifier ou le supprimer. Après suppression, tu pourras republier.</p>'}else{$('messageForm').classList.remove('hidden');$('myStatus').classList.add('hidden')}}
function esc(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function renderMessages(){const list=$('messagesList');list.innerHTML='';activeMessages().sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0)).forEach(([id,m])=>{const own=id===deviceId;const el=document.createElement('article');el.className='message';el.innerHTML=`<div class="message-head"><strong>${esc(m.emotion)} ${esc(m.anonymous?'Anonyme':m.name||'Anonyme')}</strong><small>${new Date(m.updatedAt||m.createdAt).toLocaleString('fr-FR')}</small></div><p>${esc(m.text)}</p>${own?'<div class="message-actions"><button class="edit">✏️ Modifier mon message</button><button class="delete">🗑️ Supprimer mon message</button></div>':''}`;if(own){el.querySelector('.edit').onclick=()=>editMine(m);el.querySelector('.delete').onclick=()=>deleteMine()}list.appendChild(el)});if(!list.children.length)list.innerHTML='<p>Aucun message pour le moment. Le premier sera peut-être le tien ✨</p>'}
$('messageForm').addEventListener('submit',async e=>{e.preventDefault();const text=$('message').value.trim();if(!text)return alert('Écris un petit message.');if(moment.confirmPost&&!confirm('Tu confirmes ce post ?'))return;const data={name:$('name').value.trim(),anonymous:$('anonymous').checked,emotion:$('emotion').value,text,createdAt:Date.now(),updatedAt:Date.now(),deleted:false};await set(ref(db,`messages/${momentId}/${deviceId}`),data);$('message').value='';$('counter').textContent='0/280'});
function editMine(m){const next=prompt('Modifie ton message :',m.text);if(next===null||!next.trim())return;if(moment.confirmPost&&!confirm('Tu confirmes cette modification ?'))return;update(ref(db,`messages/${momentId}/${deviceId}`),{text:next.trim(),updatedAt:Date.now()})}
async function deleteMine(){if(moment.confirmDelete&&!confirm('Supprimer ton message ? Tu pourras ensuite republier.'))return;await remove(ref(db,`messages/${momentId}/${deviceId}`))}
$('playFinal').onclick=playCeremony;$('replay').onclick=playCeremony;$('closeCeremony').onclick=()=>$('ceremony').classList.add('hidden');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function burst(symbols='✨🌸🎉🎆'){for(let i=0;i<45;i++){const p=document.createElement('span');p.className='particle';p.textContent=symbols[Math.floor(Math.random()*symbols.length)];p.style.left='50%';p.style.top='50%';p.style.setProperty('--x',`${(Math.random()-.5)*1100}px`);p.style.setProperty('--y',`${(Math.random()-.5)*800}px`);$('particles').appendChild(p);setTimeout(()=>p.remove(),3000)}}
async function playCeremony(){const c=$('ceremony'),text=$('ceremonyText'),ca=$('cauldron'),book=$('book');c.classList.remove('hidden');$('replay').classList.add('hidden');$('closeCeremony').classList.add('hidden');ca.classList.remove('hidden');book.classList.add('hidden');text.textContent='Les émotions prennent vie…';await sleep(2600);burst('🔥✨💫');text.textContent='';await sleep(1800);ca.classList.add('hidden');book.classList.remove('hidden');await sleep(1400);const arr=activeMessages().map(([,m])=>m);const total=Math.min(35000,Math.max(20000,18000+arr.length*1800));const per=Math.max(1800,Math.min(4000,(total-9000)/Math.max(1,arr.length)));for(const m of arr){text.textContent=`${m.emotion} ${m.anonymous?'Anonyme':m.name||'Anonyme'}\n\n${m.text}`;burst(m.emotion+'✨');await sleep(per)}text.textContent='';burst('🎆🎉🌸✨');await sleep(2200);book.classList.add('hidden');text.textContent=moment.finalText||'Même sans parler tous les jours… on reste reliés. ❤️';await sleep(5000);$('replay').classList.remove('hidden');$('closeCeremony').classList.remove('hidden')}
