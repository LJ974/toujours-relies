import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, get, update } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app=getApps()[0]||initializeApp(firebaseConfig),db=getDatabase(app);
const defaults={
  opening1:'Chaque personne a offert une petite lumière…',
  opening2:'…et ensemble, ces lumières se sont rencontrées.',
  positive1:'Tu es unique.',
  positive2:'Tu es formidable.',
  positive3:'Ta présence compte.',
  closing:'Ce moment s’achève…\nmais ce que vous avez créé ensemble continue d’exister.',
  signature:'Toujours Reliés'
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function momentIdFromCard(card){
  const link=card.querySelector('a[href*="?m="]');
  if(!link)return null;
  try{return new URL(link.href).searchParams.get('m')}catch{return null}
}

async function openEditor(id){
  const modal=document.getElementById('adminModal'),content=document.getElementById('modalContent');
  if(!modal||!content)return;
  content.innerHTML='<p>Chargement des textes…</p>';modal.classList.remove('hidden');
  const snap=await get(ref(db,`moments/${id}`)),m=snap.val()||{},t={...defaults,...(m.ceremonyTexts||{})};
  content.innerHTML=`<p class="eyebrow">TEXTES DE LA CÉRÉMONIE</p><h2>${esc(m.title||'Moment')}</h2><p class="notice">Ces textes sont propres à ce moment. Laisse-les tels quels pour garder la version émotionnelle par défaut.</p><form id="ceremonyTextForm"><label>Première phrase d’ouverture<textarea id="ctOpening1" rows="2" maxlength="180">${esc(t.opening1)}</textarea></label><label>Deuxième phrase d’ouverture<textarea id="ctOpening2" rows="2" maxlength="180">${esc(t.opening2)}</textarea></label><h3>Phrases positives</h3><label>Phrase 1<input id="ctPositive1" maxlength="100" value="${esc(t.positive1)}"></label><label>Phrase 2<input id="ctPositive2" maxlength="100" value="${esc(t.positive2)}"></label><label>Phrase 3<input id="ctPositive3" maxlength="100" value="${esc(t.positive3)}"></label><label>Signature finale<input id="ctSignature" maxlength="100" value="${esc(t.signature)}"></label><label>Phrase de fermeture<textarea id="ctClosing" rows="3" maxlength="280">${esc(t.closing)}</textarea></label><div class="action-grid ceremony-text-actions"><button type="button" class="secondary" id="resetCeremonyTexts">↺ Textes par défaut</button><button type="submit" class="primary">Enregistrer les textes</button></div><p id="ceremonyTextStatus" class="muted"></p></form>`;
  const fill=v=>{document.getElementById('ctOpening1').value=v.opening1;document.getElementById('ctOpening2').value=v.opening2;document.getElementById('ctPositive1').value=v.positive1;document.getElementById('ctPositive2').value=v.positive2;document.getElementById('ctPositive3').value=v.positive3;document.getElementById('ctSignature').value=v.signature;document.getElementById('ctClosing').value=v.closing};
  document.getElementById('resetCeremonyTexts').onclick=()=>{if(confirm('Remettre tous les textes émotionnels par défaut ?'))fill(defaults)};
  document.getElementById('ceremonyTextForm').onsubmit=async e=>{e.preventDefault();const btn=e.submitter,status=document.getElementById('ceremonyTextStatus');btn.disabled=true;btn.textContent='Enregistrement…';const ceremonyTexts={opening1:document.getElementById('ctOpening1').value.trim()||defaults.opening1,opening2:document.getElementById('ctOpening2').value.trim()||defaults.opening2,positive1:document.getElementById('ctPositive1').value.trim()||defaults.positive1,positive2:document.getElementById('ctPositive2').value.trim()||defaults.positive2,positive3:document.getElementById('ctPositive3').value.trim()||defaults.positive3,signature:document.getElementById('ctSignature').value.trim()||defaults.signature,closing:document.getElementById('ctClosing').value.trim()||defaults.closing};try{await update(ref(db,`moments/${id}`),{ceremonyTexts,ceremonyTextsUpdatedAt:Date.now()});status.textContent='Textes enregistrés ✓';btn.textContent='Enregistré ✓';setTimeout(()=>modal.classList.add('hidden'),800)}catch(err){console.error(err);status.textContent='Impossible d’enregistrer. Vérifie la connexion.';btn.disabled=false;btn.textContent='Enregistrer les textes'}};
}

function enhanceCards(){
  document.querySelectorAll('.moment-admin').forEach(card=>{
    if(card.querySelector('.ceremony-texts'))return;
    const id=momentIdFromCard(card),grid=card.querySelector('.more-actions .action-grid');
    if(!id||!grid)return;
    const btn=document.createElement('button');btn.type='button';btn.className='secondary ceremony-texts';btn.textContent='✍️ Textes de la cérémonie';btn.onclick=()=>openEditor(id);grid.prepend(btn);
  });
}

new MutationObserver(enhanceCards).observe(document.body,{childList:true,subtree:true});
enhanceCards();
