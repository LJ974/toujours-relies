import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const params = new URLSearchParams(location.search);
const momentId = params.get('m');
const preview = params.get('preview') === '1';
const invitation = document.getElementById('invitationScreen');
const experience = document.getElementById('experience');
const enterButton = document.getElementById('enterMoment');
const title = document.getElementById('invitationTitle');
const intro = document.getElementById('invitationIntro');
const deadline = document.getElementById('invitationDeadline');
const sessionKey = momentId ? `tr_invitation_seen_${momentId}` : '';

function revealExperience() {
  invitation?.classList.add('invitation-leaving');
  window.setTimeout(() => {
    invitation?.classList.add('hidden');
    invitation?.classList.remove('invitation-leaving');
    experience?.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }, 360);
  if (sessionKey) sessionStorage.setItem(sessionKey, '1');
}

function formatDeadline(moment) {
  const end = Number(moment?.endsAt || 0);
  if (!end) return '';
  const closed = moment.forceFinal || Date.now() >= end;
  if (closed) return '✨ La cérémonie est maintenant disponible';
  return `🕰 Tu peux participer jusqu’au ${new Date(end).toLocaleString('fr-FR', {dateStyle:'long', timeStyle:'short'})}`;
}

if (!momentId || preview || sessionStorage.getItem(sessionKey) === '1') {
  experience?.classList.remove('hidden');
} else {
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const db = getDatabase(app);
  onValue(ref(db, `moments/${momentId}`), snapshot => {
    const moment = snapshot.val();
    if (!moment) {
      experience?.classList.remove('hidden');
      invitation?.classList.add('hidden');
      return;
    }
    title.textContent = moment.title || 'Tu es invité(e) à un moment collectif';
    intro.textContent = moment.intro || 'Une personne a souhaité créer un petit moment à partager avec toi.';
    deadline.textContent = formatDeadline(moment);
    const closed = moment.forceFinal || Date.now() >= Number(moment.endsAt || 0);
    enterButton.textContent = closed ? 'Découvrir la cérémonie' : 'Participer au moment';
    invitation.classList.remove('hidden');
  }, () => {
    experience?.classList.remove('hidden');
    invitation?.classList.add('hidden');
  }, {onlyOnce:true});
}

enterButton?.addEventListener('click', revealExperience);
