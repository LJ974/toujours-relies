const lockCauldronChoice = () => {
  const creation = document.getElementById('animationType');
  if (creation) {
    creation.innerHTML = '<option value="cauldron" selected>🔥 Chaudron cinématique</option>';
    creation.value = 'cauldron';
    creation.disabled = true;
  }

  const edit = document.getElementById('eAnimation');
  if (edit) {
    edit.innerHTML = '<option value="cauldron" selected>🔥 Chaudron cinématique</option>';
    edit.value = 'cauldron';
    edit.disabled = true;
  }
};

lockCauldronChoice();
document.addEventListener('click', (event) => {
  if (event.target.closest('.edit')) {
    setTimeout(lockCauldronChoice, 0);
  }
});
