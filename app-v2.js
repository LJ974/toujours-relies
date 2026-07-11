import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, onValue, set, remove, update } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const momentId = params.get('m');
const preview = params.get('preview') === '1';
const deviceKey = 'tr_device_id';
let deviceId = localStorage.getItem(deviceKey);
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem(deviceKey, deviceId);
}

const emotions = ['😊 Heureux','🥰 Amoureux','😂 Mort de rire','😌 Apaisé','🤩 Fier','🙏 Reconnaissant','😴 Fatigué','🤒 Malade','😐 Sans émotion','😮‍💨 Blasé','😡 En colère','😢 Triste','😰 Stressé','🤯 Débordé','🥺 Ému','💙 Besoin de soutien','🌈 Plein d’espoir','✨ Petite victoire','🎉 Bonne nouvelle'];
emotions.forEach((item) => $('emotion').add(new Option(item, item.split(' ')[0])));
$('name').value = localStorage.getItem('tr_name') || '';
$('anonymous').checked = localStorage.getItem('tr_anonymous') === '1';

let moment = null;
let messages = {};
let myMessage = null;
let timer = null;
let ceremonyRunning = false;

$('message').addEventListener('input', () => $('counter').textContent = `${$('message').value.length}/280`);

if (!momentId) {
  showEmpty();
} else {
  onValue(ref(db, `moments/${momentId}`), (snapshot) => {
    moment = snapshot.val();
    if (!moment) return showEmpty();
    renderMoment();
  });
  onValue(ref(db, `messages/${momentId}`), (snapshot) => {
    messages = snapshot.val() || {};
    myMessage = messages[deviceId] || null;
    renderAll();
  });
}

function showEmpty() {
  $('emptyState').classList.remove('hidden');
  ['statusCard','progressCard','participationCard','messagesCard','finalCard','shareCard'].forEach((id) => $(id).classList.add('hidden'));
}

function isClosed() {
  return Boolean(moment && (preview || moment.forceFinal || Date.now() >= Number(moment.endsAt || 0)));
}

function activeMessages() {
  return Object.entries(messages).filter(([, item]) => item && !item.deleted);
}

function renderMoment() {
  $('emptyState').classList.add('hidden');
  $('momentTitle').textContent = moment.title || 'Un petit moment entre nous';
  $('momentIntro').textContent = moment.intro || '';
  $('messagesCard').classList.remove('hidden');
  $('shareCard').classList.remove('hidden');
  $('progressCard').classList.toggle('hidden', moment.gaugeVisibility === 'hidden');
  clearInterval(timer);
  timer = setInterval(updateCountdown, 1000);
  renderAll();
}

function renderAll() {
  if (!moment) return;
  renderProgress();
  renderMessages();
  renderForm();
  updateCountdown();
}

function updateCountdown() {
  if (!moment) return;
  const closed = isClosed();
  const remaining = Math.max(0, Number(moment.endsAt || 0) - Date.now());
  $('statusCard').classList.remove('hidden');
  if (closed) {
    $('countdown').textContent = preview ? 'Prévisualisation' : 'Moment terminé ✨';
    $('participationCard').classList.add('hidden');
    $('finalCard').classList.remove('hidden');
    $('statusTitle').textContent = preview ? 'Aperçu administrateur' : 'La participation est terminée';
    $('statusText').textContent = preview ? 'Cet aperçu ne ferme pas le moment et ne modifie aucune participation.' : 'Plus aucun message ne peut être ajouté, modifié ou supprimé. Toute personne ayant le lien peut découvrir et rejouer la cérémonie.';
    return;
  }
  $('finalCard').classList.add('hidden');
  $('participationCard').classList.remove('hidden');
  $('statusTitle').textContent = 'Le moment est ouvert';
  $('statusText').textContent = 'La cérémonie sera accessible à tous dès la fin du délai, même aux personnes qui n’ont pas participé.';
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  $('countdown').textContent = days > 0 ? `${days}j ${hours}h ${minutes}m restantes` : `${hours}h ${minutes}m ${seconds}s restantes`;
  renderForm();
}

function renderProgress() {
  if (!moment) return;
  const percent = Math.min(100, Math.round(activeMessages().length / Math.max(1, Number(moment.target) || 1) * 100));
  $('progressBar').style.width = `${percent}%`;
  $('progressText').textContent = `${percent} %`;
  $('progressLabel').textContent = percent >= 100 ? 'Objectif atteint ✨' : percent >= 60 ? 'Le lien prend vie' : percent >= 20 ? 'Les premiers mots arrivent' : 'Le moment commence doucement';
}

function renderForm() {
  if (!moment || isClosed()) return;
  if (myMessage && !myMessage.deleted) {
    $('messageForm').classList.add('hidden');
    $('myStatus').classList.remove('hidden');
    $('myStatus').innerHTML = '<p class="notice">Ton message est validé. Tu ne peux pas en ajouter un deuxième. Utilise les boutons sous ta phrase pour le modifier ou le supprimer. Après suppression, tu pourras republier.</p>';
  } else {
    $('messageForm').classList.remove('hidden');
    $('myStatus').classList.add('hidden');
  }
}

function escapeText(value = '') {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

function renderMessages() {
  const list = $('messagesList');
  list.innerHTML = '';
  activeMessages().sort((a,b) => (a[1].createdAt || 0) - (b[1].createdAt || 0)).forEach(([id, item]) => {
    const own = id === deviceId;
    const canEdit = own && !isClosed();
    const canDelete = canEdit && moment.allowWithdrawal !== false;
    const article = document.createElement('article');
    article.className = 'message';
    article.innerHTML = `<div class="message-head"><strong>${escapeText(item.emotion)} ${escapeText(item.anonymous ? 'Anonyme' : item.name || 'Anonyme')}</strong><small>${new Date(item.updatedAt || item.createdAt).toLocaleString('fr-FR')}</small></div><p>${escapeText(item.text)}</p>${canEdit ? `<div class="message-actions"><button class="edit">✏️ Modifier mon message</button>${canDelete ? '<button class="delete">🗑️ Supprimer mon message</button>' : ''}</div>` : ''}`;
    if (canEdit) article.querySelector('.edit').onclick = () => editMine(item);
    if (canDelete) article.querySelector('.delete').onclick = deleteMine;
    list.appendChild(article);
  });
  if (!list.children.length) list.innerHTML = '<p class="muted">Aucun message pour le moment. Le premier sera peut-être le tien ✨</p>';
}

$('messageForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isClosed()) return alert('Le délai est terminé. Il n’est plus possible de participer.');
  if (myMessage && !myMessage.deleted) return alert('Tu as déjà un message actif. Modifie-le ou supprime-le avant de republier.');
  const text = $('message').value.trim();
  if (!text) return alert('Écris un petit message.');
  if (moment.confirmPost !== false && !confirm('Tu confirmes ce message ?')) return;
  const button = $('submitMessage');
  button.disabled = true;
  button.textContent = 'Envoi…';
  try {
    const data = {name:$('name').value.trim(),anonymous:$('anonymous').checked,emotion:$('emotion').value,text,createdAt:Date.now(),updatedAt:Date.now(),deleted:false};
    await set(ref(db, `messages/${momentId}/${deviceId}`), data);
    localStorage.setItem('tr_name', data.name);
    localStorage.setItem('tr_anonymous', data.anonymous ? '1' : '0');
    $('message').value = '';
    $('counter').textContent = '0/280';
  } catch (error) {
    console.error(error);
    alert('Le message n’a pas pu être enregistré. Vérifie ta connexion et réessaie.');
  } finally {
    button.disabled = false;
    button.textContent = '💫 Déposer mon message';
  }
});

async function editMine(item) {
  if (isClosed()) return alert('Le moment est terminé. Le message ne peut plus être modifié.');
  const next = prompt('Modifie ton message :', item.text);
  if (next === null || !next.trim()) return;
  if (moment.confirmEdit !== false && !confirm('Tu confirmes cette modification ?')) return;
  try { await update(ref(db, `messages/${momentId}/${deviceId}`), {text:next.trim(),updatedAt:Date.now()}); }
  catch (error) { console.error(error); alert('La modification a échoué. Réessaie.'); }
}

async function deleteMine() {
  if (isClosed()) return alert('Le moment est terminé. Le message ne peut plus être supprimé.');
  if (moment.allowWithdrawal === false) return;
  if (moment.confirmDelete !== false && !confirm('Supprimer ton message ? Tu pourras ensuite en publier un autre tant que le moment reste ouvert.')) return;
  try { await remove(ref(db, `messages/${momentId}/${deviceId}`)); }
  catch (error) { console.error(error); alert('La suppression a échoué. Réessaie.'); }
}

$('playFinal').onclick = playCeremony;
$('replay').onclick = playCeremony;
$('closeCeremony').onclick = () => { if (!ceremonyRunning) $('ceremony').classList.add('hidden'); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function burst(symbols = '✨🌸🎉🎆', count = 45) {
  for (let i=0;i<count;i++) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.textContent = symbols[Math.floor(Math.random()*symbols.length)];
    particle.style.left = '50%';
    particle.style.top = '50%';
    particle.style.setProperty('--x', `${(Math.random()-.5)*1100}px`);
    particle.style.setProperty('--y', `${(Math.random()-.5)*800}px`);
    $('particles').appendChild(particle);
    setTimeout(() => particle.remove(), 3000);
  }
}

function chosenAnimation() {
  const type = moment?.animationType || 'book';
  return type === 'random' ? ['cauldron','book','fireworks','petals'][Math.floor(Math.random()*4)] : type;
}

async function introAnimation(type, cauldron, book, text) {
  cauldron.classList.add('hidden');
  book.classList.add('hidden');
  if (type === 'cauldron') {
    cauldron.classList.remove('hidden'); text.textContent = 'Le chaudron se réveille…'; await sleep(2200); burst('🔥✨💫',55); await sleep(1400); cauldron.classList.add('hidden'); book.classList.remove('hidden');
  } else if (type === 'book') {
    book.classList.remove('hidden'); text.textContent = 'Le livre magique s’ouvre…'; burst('📖✨💫',40); await sleep(2800);
  } else if (type === 'fireworks') {
    text.textContent = 'Les émotions illuminent le ciel…'; burst('🎆✨🎇💫',75); await sleep(3000); book.classList.remove('hidden');
  } else {
    text.textContent = 'Les mots s’envolent doucement…'; burst('🌸🌺🌷✨',70); await sleep(3000); book.classList.remove('hidden');
  }
  text.textContent = '';
  await sleep(700);
}

async function playCeremony() {
  if (ceremonyRunning) return;
  ceremonyRunning = true;
  const ceremony = $('ceremony'), text = $('ceremonyText'), cauldron = $('cauldron'), book = $('book');
  ceremony.classList.remove('hidden'); $('replay').classList.add('hidden'); $('closeCeremony').classList.add('hidden');
  try {
    const type = chosenAnimation();
    await introAnimation(type, cauldron, book, text);
    const items = activeMessages().map(([,item]) => item);
    if (!items.length) {
      text.textContent = 'Même sans message déposé, ce moment nous rappelle que le lien existe.';
      await sleep(4000);
    } else {
      const total = Math.min(35000, Math.max(20000, 12000 + items.length * 2600));
      const perMessage = Math.max(2200, Math.min(4500, (total - 9000) / items.length));
      for (const item of items) {
        text.textContent = `${item.emotion} ${item.anonymous ? 'Anonyme' : item.name || 'Anonyme'}\n\n${item.text}`;
        burst(type === 'petals' ? '🌸✨' : type === 'fireworks' ? '🎆✨' : type === 'cauldron' ? '🔥✨' : '📖✨', 24);
        await sleep(perMessage);
      }
    }
    text.textContent = '';
    burst(type === 'petals' ? '🌸🌺🌷✨' : type === 'fireworks' ? '🎆🎇✨🎉' : type === 'book' ? '📖🎉✨💫' : '🔥🎆🎉✨', 80);
    await sleep(2200);
    book.classList.add('hidden'); cauldron.classList.add('hidden');
    text.textContent = moment.finalText || 'Même sans parler tous les jours… on reste reliés. ❤️';
    await sleep(5000);
  } finally {
    ceremonyRunning = false;
    $('replay').classList.remove('hidden');
    $('closeCeremony').classList.remove('hidden');
  }
}

function publicUrl() { return location.href.replace('&preview=1',''); }
function shareText() {
  const end = moment?.endsAt ? new Date(moment.endsAt).toLocaleString('fr-FR') : '';
  return isClosed() ? `✨ La cérémonie « ${moment?.title || 'Toujours Reliés'} » est prête.` : `💌 J’ai créé un moment « ${moment?.title || 'Toujours Reliés'} ». Tu peux déposer un mot jusqu’au ${end}.`;
}
async function copyLink() {
  try { await navigator.clipboard.writeText(publicUrl()); $('shareStatus').textContent = 'Lien copié ✨'; }
  catch { $('shareStatus').textContent = 'Copie l’adresse affichée dans la barre du navigateur.'; }
}
$('copyPublicLink').onclick = copyLink;
$('shareWhatsApp').onclick = () => location.href = `https://wa.me/?text=${encodeURIComponent(`${shareText()} ${publicUrl()}`)}`;
$('shareNative').onclick = async () => {
  if (navigator.share) { try { await navigator.share({title:moment?.title || 'Toujours Reliés',text:shareText(),url:publicUrl()}); } catch {} }
  else await copyLink();
};
