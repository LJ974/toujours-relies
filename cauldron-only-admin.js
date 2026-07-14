const keepCauldronOnly=()=>{
  const creation=document.getElementById('animationType');
  if(creation){creation.innerHTML='<option value="cauldron" selected>🔥 Chaudron cinématique</option>';creation.value='cauldron'}
  const edit=document.getElementById('eAnimation');
  if(edit){edit.innerHTML='<option value="cauldron" selected>🔥 Chaudron cinématique</option>';edit.value='cauldron'}
};
keepCauldronOnly();
new MutationObserver(keepCauldronOnly).observe(document.body,{childList:true,subtree:true});