const NEW_FINAL='Merci d’avoir partagé un morceau de toi.';
const isOldFinal=value=>/morceau de (votre|la) journée/i.test(String(value||''));

function patchInstantFinal(){
  const theme=document.getElementById('theme');
  const preset=document.getElementById('finalPreset');
  const text=document.getElementById('finalText');
  if(!theme||theme.value!=='Instant du jour'||!preset||!text)return;
  [...preset.options].forEach(option=>{if(isOldFinal(option.value)){option.value=NEW_FINAL;option.textContent=NEW_FINAL}});
  if(!text.value.trim()||isOldFinal(text.value))text.value=NEW_FINAL;
  if(isOldFinal(preset.value))preset.value=NEW_FINAL;
}

document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(patchInstantFinal,0);
  document.getElementById('theme')?.addEventListener('change',()=>setTimeout(patchInstantFinal,0));
  document.getElementById('finalPreset')?.addEventListener('change',()=>setTimeout(patchInstantFinal,0));
});