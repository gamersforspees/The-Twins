const app=$('#app');let me=null,news=[],filter='all',view='news';
const FILT={all:'جميع الأخبار',urgent:'الأخبار العاجلة',homework:'الواجبات',alert:'التنبيهات',reminder:'مواعيد الدروس'};
async function boot(){try{const r=await api('GET','/api/me');if(r.kind==='student'){me=r.user;return home()}}catch(e){}login()}
function login(){app.innerHTML=`<form class="card" id="f"><h2>دخول الطلاب</h2><label>الاسم الثلاثي</label><input name="name" required autocomplete="name">
<label>رقم الموبايل</label><input name="phone" required inputmode="tel" autocomplete="tel"><button class="btn big">دخول</button>
<p class="meta"><a href="/admin">دخول المشرف</a></p></form>`;
 $('#f').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
  try{await api('POST','/api/student/login',d);app.innerHTML=`<div class="card" style="text-align:center"><svg class="check" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M28 52l16 16 30-34"/></svg><h2 style="color:var(--green)">تم التحقق من بياناتك بنجاح! أهلًا بك في The Twins</h2></div>`;
   setTimeout(boot,1500)}catch(x){toast(x.message,false)}}}
async function home(){app.innerHTML=`<p>أهلًا بك! 👋 تابع هنا آخر الأخبار والقرارات والتعليمات الخاصة بمجموعتك.</p>
<div class="tabs"><button class="btn" data-v="news">الأخبار</button><button class="btn" data-v="ask">➕ إضافة استفسار</button><button class="btn" data-v="mine">استفساراتي وردودها</button><button class="btn alt" data-v="out">خروج</button></div><div id="v"></div>
<button class="fab" id="fab">صديق المقرر 💬<small>أقدر أساعدك إزاي؟</small></button>`;
 app.onclick=async e=>{const b=e.target.closest('[data-v],[data-f],[data-open],[data-fab]');if(!b)return;
  if(b.dataset.v==='out'){await api('POST','/api/logout');return location.reload()}
  if(b.dataset.v){view=b.dataset.v;draw()}
  if(b.dataset.f){filter=b.dataset.f;view='news';draw()}
  if(b.dataset.open)openNews(+b.dataset.open);
  if(b.dataset.fab){$('.menu')?.remove();const a=b.dataset.fab;if(a==='latest'){filter='all';view='news'}if(a==='todo'){filter='homework';view='news'}
   if(a==='dates'){filter='reminder';view='news'}if(a==='ask')view='ask';if(a==='missed'){filter='missed';view='news'}draw()}};
 $('#fab').onclick=()=>{if($('.menu'))return $('.menu').remove();const m=document.createElement('div');m.className='menu';
  m.innerHTML=[['latest','📢 آخر الأخبار'],['todo','📚 إيه المطلوب مني؟'],['dates','📅 مواعيد الدروس'],['ask','❓ عندي استفسار'],['missed','🔔 أخبار مهمة فاتتني']].map(([k,t])=>`<button data-fab="${k}">${t}</button>`).join('');app.append(m)};
 draw()}
async function draw(){const v=$('#v');
 if(view==='ask'){v.innerHTML=`<form class="card" id="q"><h3>إضافة استفسار</h3><label>عنوان الاستفسار</label><input name="title" maxlength="120" required><label>التفاصيل</label><textarea name="body" rows="5" maxlength="3000" required></textarea><button class="btn">إرسال الاستفسار</button></form>`;
  $('#q').onsubmit=async e=>{e.preventDefault();try{await api('POST','/api/student/inquiries',Object.fromEntries(new FormData(e.target)));toast('تم استلام استفسارك وسيرد عليك المشرف قريبًا ✅');view='mine';draw()}catch(x){toast(x.message,false)}};return}
 if(view==='mine'){const r=await api('GET','/api/student/inquiries');v.innerHTML=r.inquiries.length?r.inquiries.map(i=>`<div class="card"><b>${esc(i.title)}</b> <span class="chip ${i.status==='replied'?'ok':''}">${ST[i.status]}</span>
  <p>${esc(i.body)}</p>${i.reply?`<div class="card" style="background:#eef7f1"><b>رد المشرف:</b><br>${esc(i.reply)}<div class="meta">${fmt(i.replied_at)}</div></div>`:'<p class="meta">لم يصل رد بعد.</p>'}</div>`).join(''):'<div class="card">لم ترسل استفسارات بعد. اضغط «إضافة استفسار» لتبدأ.</div>';return}
 try{news=(await api('GET','/api/student/news')).news}catch(e){return location.reload()}
 let l=news;if(filter==='missed')l=news.filter(n=>!n.is_read&&(n.pinned||['urgent','homework','alert','decision'].includes(n.kind)));else if(filter!=='all')l=news.filter(n=>n.kind===filter);
 v.innerHTML=`<div class="tabs">${Object.entries({...FILT,missed:'🔔 فاتتني'}).map(([k,t])=>`<button class="btn sm ${filter===k?'on':'alt'}" data-f="${k}">${t}</button>`).join('')}</div>`+
 (l.length?l.map(n=>`<article class="card news ${n.kind==='urgent'?'urgent':''} ${n.pinned?'pinned':''} ${n.is_read?'':'unread'}"><span class="chip ${n.kind==='urgent'?'urgent':''}">${KINDS[n.kind]}</span>${n.pinned?' <span class="chip">📌 مثبت</span>':''}
  <h3>${esc(n.title)}</h3><div class="body clamp">${n.body_html}</div><div class="meta">${fmt(n.published_at)}</div><button class="btn sm" data-open="${n.id}">قراءة الخبر كاملًا</button></article>`).join(''):'<div class="card">لا توجد أخبار في هذا القسم الآن.</div>')}
function openNews(id){const n=news.find(x=>x.id===id);if(!n)return;modal(`<span class="chip ${n.kind==='urgent'?'urgent':''}">${KINDS[n.kind]}</span><h2>${esc(n.title)}</h2><div class="body">${n.body_html}</div><div class="meta">${fmt(n.published_at)}</div>`);
 api('POST',`/api/student/news/${id}/read`).then(()=>{n.is_read=1})}
boot();
