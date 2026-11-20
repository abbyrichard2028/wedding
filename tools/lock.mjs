// Password-locks the wedding site.
//
//   Lock:    node tools/lock.mjs lock   <password>   (reads site.html  -> writes index.html)
//   Unlock:  node tools/lock.mjs unlock <password>   (reads index.html -> writes site.html)
//
// site.html is the readable source and is git-ignored: never commit it.
// index.html holds only the encrypted site (AES-256-GCM, key from PBKDF2-SHA256),
// so the content can't be read from the public repo without the password.

import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const ITERATIONS = 600000;
const [mode, password] = process.argv.slice(2);
if (!['lock', 'unlock'].includes(mode) || !password) {
  console.error('Usage: node tools/lock.mjs lock|unlock <password>');
  process.exit(1);
}

const enc = new TextEncoder();
const b64 = (buf) => Buffer.from(buf).toString('base64');
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function deriveKey(salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

if (mode === 'lock') {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(readFileSync('site.html', 'utf8')));
  const payload = JSON.stringify({ s: b64(salt), i: b64(iv), c: b64(ct), n: ITERATIONS });
  writeFileSync('index.html', gate(payload));
  console.log('index.html written (locked).');
} else {
  const html = readFileSync('index.html', 'utf8');
  const p = JSON.parse(html.match(/<script id="payload" type="application\/json">(.*?)<\/script>/s)[1]);
  const key = await deriveKey(unb64(p.s));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p.i) }, key, unb64(p.c));
  writeFileSync('site.html', Buffer.from(pt));
  console.log('site.html written (unlocked).');
}

function gate(payload) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Abby &amp; Richard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&amp;family=Jost:wght@300;400;500&amp;display=swap" rel="stylesheet">
<style>
  html,body{margin:0;height:100%}
  body{background:#1C2430;color:#FBFAF7;font-family:'Jost',system-ui,sans-serif;font-weight:300;
       display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center}
  .card{width:100%;max-width:420px}
  .eyebrow{margin:0 0 24px;font-size:13px;letter-spacing:.32em;text-transform:uppercase;color:#D9C59E;font-weight:400}
  h1{margin:0;font-family:'Bodoni Moda',serif;font-weight:400;font-size:clamp(44px,12vw,72px);line-height:1}
  h1 em{color:#D9C59E}
  .rule{width:64px;height:1px;background:#D9C59E;margin:32px auto}
  form{display:flex;flex-direction:column;gap:12px;margin-top:8px}
  label{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#C9CFD8}
  input{font:inherit;font-size:17px;padding:14px 16px;border:1px solid #D9C59E;background:transparent;color:#FBFAF7;text-align:center}
  input:focus{outline:2px solid #D9C59E;outline-offset:2px}
  button{font:inherit;min-height:52px;background:#D9C59E;color:#1C2430;border:0;font-size:13px;letter-spacing:.22em;text-transform:uppercase;font-weight:500;cursor:pointer}
  button[disabled]{opacity:.7;cursor:wait}
  .err{min-height:24px;margin:4px 0 0;color:#F2B8A2;font-size:15px}
  .remember{display:flex;gap:8px;align-items:center;justify-content:center;font-size:14px;color:#C9CFD8;letter-spacing:0;text-transform:none}
  .remember input{width:18px;height:18px;padding:0;accent-color:#D9C59E}
</style>
</head>
<body>
<main class="card">
  <p class="eyebrow">June 2028 &middot; Picton</p>
  <h1>Abby <em>&amp;</em> Richard</h1>
  <div class="rule"></div>
  <form id="f">
    <label for="pw">Enter the password from your invitation</label>
    <input id="pw" type="password" autocomplete="current-password" required autofocus>
    <label class="remember"><input id="rm" type="checkbox" checked> Remember me on this device</label>
    <button id="go" type="submit">Enter</button>
    <p class="err" id="err" role="alert"></p>
  </form>
</main>
<script id="payload" type="application/json">${payload}</script>
<script>
(function(){
  var p = JSON.parse(document.getElementById('payload').textContent);
  var KEY = 'ar-wedding-pw';
  function unb64(s){ var b = atob(s), u = new Uint8Array(b.length); for (var i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
  async function open(pw){
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey({name:'PBKDF2', salt:unb64(p.s), iterations:p.n, hash:'SHA-256'},
      base, {name:'AES-GCM', length:256}, false, ['decrypt']);
    var pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(p.i)}, key, unb64(p.c));
    return new TextDecoder().decode(pt);
  }
  function show(html){ document.open(); document.write(html); document.close(); }
  function store(get, v){ try { return get ? localStorage.getItem(KEY) : (v === null ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, v)); } catch (e) { return null; } }
  var saved = store(true);
  if (saved) open(saved).then(show).catch(function(){ store(false, null); });
  document.getElementById('f').addEventListener('submit', function(e){
    e.preventDefault();
    var pw = document.getElementById('pw').value, btn = document.getElementById('go'), err = document.getElementById('err');
    btn.disabled = true; btn.textContent = 'Opening\\u2026'; err.textContent = '';
    open(pw).then(function(html){
      store(false, document.getElementById('rm').checked ? pw : null);
      show(html);
    }).catch(function(){
      btn.disabled = false; btn.textContent = 'Enter';
      err.textContent = 'That password didn\\u2019t work. Please try again.';
    });
  });
})();
</script>
</body>
</html>
`;
}
