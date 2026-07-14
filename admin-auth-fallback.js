(() => {
  const USER_HASH='8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
  const PASS_HASH='10993a59dae822b56f42323c444f47978e04f72ec88bfb2a319e96a47d9b34e7';
  const form=document.getElementById('loginForm');
  if(!form)return;
  const hash=async value=>{
    const bytes=new TextEncoder().encode(value);
    const result=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('');
  };
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    const error=document.getElementById('loginError');
    const button=form.querySelector('button[type="submit"]');
    error.textContent='';
    button.disabled=true;
    button.textContent='Connexion…';
    try{
      const login=document.getElementById('login').value.trim();
      const password=document.getElementById('password').value;
      const [userHash,passHash]=await Promise.all([hash(login),hash(password)]);
      if(userHash===USER_HASH&&passHash===PASS_HASH){
        sessionStorage.setItem('tr_admin','1');
        location.reload();
      }else{
        error.textContent='Identifiant ou mot de passe incorrect.';
        button.disabled=false;
        button.textContent='Se connecter';
      }
    }catch(err){
      console.error(err);
      error.textContent='La connexion n’a pas pu démarrer. Actualise la page puis réessaie.';
      button.disabled=false;
      button.textContent='Se connecter';
    }
  },true);
})();
