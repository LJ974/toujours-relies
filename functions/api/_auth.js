const enc=new TextEncoder();
export async function sign(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,enc.encode(value));return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/,'')}
export function cookie(request,name){const h=request.headers.get('cookie')||'';const m=h.match(new RegExp('(?:^|; )'+name+'=([^;]+)'));return m?decodeURIComponent(m[1]):null}
