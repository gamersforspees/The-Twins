const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(m,u,b){const o={method:m,headers:{'X-Requested-With':'twins'}};
 if(b instanceof FormData)o.body=b;else if(b){o.headers['Content-Type']='application/json';o.body=JSON.stringify(b)}
 const r=await fetch(u,o);let d={};try{d=await r.json()}catch(e){}
 if(!r.ok)throw Object.assign(new Error(d.error||'حدث خطأ، حاول مرة أخرى.'),{status:r.status});return d}
function toast(t,ok=true){let e=$('#toast');if(!e){e=document.createElement('div');e.id='toast';document.body.append(e)}
 e.textContent=t;e.className=ok?'ok':'bad';e.style.display='block';clearTimeout(e.t);e.t=setTimeout(()=>e.style.display='none',3500)}
const KINDS={urgent:'🔴 عاجل',announcement:'📢 إعلان',homework:'📚 واجب',alert:'⚠️ تنبيه',reminder:'⏰ موعد درس',schedule:'📅 جدول',decision:'📌 قرار',general:'📰 خبر'};
const GROUPS={all:'جميع الطلاب',sat_tue:'السبت والثلاثاء',sun_wed:'الأحد والأربعاء'};
const fmt=s=>s?new Date(s.replace(' ','T')+'Z').toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'—';
const opts=(o,sel)=>Object.entries(o).map(([k,v])=>`<option value="${k}"${k==sel?' selected':''}>${v}</option>`).join('');
const ST={pending:'قيد المراجعة',replied:'تم الرد',resolved:'تم الحل'};
function modal(html){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div>${html}<p><button class="btn alt" data-close>إغلاق</button></p></div>`;
 m.onclick=e=>{if(e.target===m||e.target.dataset.close!==undefined)m.remove()};document.body.append(m);return m}
