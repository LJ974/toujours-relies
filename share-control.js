import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const params = new URLSearchParams(location.search);
const momentId = params.get('m');
const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getDatabase(app);
const shareCard = document.getElementById('shareCard');
let sharingAllowed = true;

function applyShareVisibility() {
  if (!shareCard) return;
  shareCard.classList.toggle('hidden', !sharingAllowed);
  shareCard.setAttribute('aria-hidden', sharingAllowed ? 'false' : 'true');
}

if (momentId && shareCard) {
  onValue(ref(db, `moments/${momentId}/allowShare`), snapshot => {
    sharingAllowed = snapshot.val() !== false;
    applyShareVisibility();
  });

  new MutationObserver(applyShareVisibility).observe(shareCard, {
    attributes: true,
    attributeFilter: ['class']
  });

  ['shareNative','shareWhatsApp','copyPublicLink'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', event => {
      if (!sharingAllowed) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  });
}