const root=$('#root');let page='home',editing=null,pend=0,U=null;
const TPL={
 urgent:{n:'🔴 خبر عاجل',kind:'urgent',title:'🔴 عاجل: ',html:'<p><strong>برجاء الانتباه فورًا:</strong></p><p>اكتب التفاصيل هنا.</p>'},
 ann:{n:'📢 إعلان مهم',kind:'announcement',title:'📢 إعلان مهم من مستر هيثم الشبراوي',html:'<p>يا شباب، نود إبلاغكم بالتالي:</p><ul><li>النقطة الأولى</li></ul>'},
 hw:{n:'📚 واجب جديد',kind:'homework',title:'📚 واجب جديد',html:'<h3>المطلوب</h3><ol><li>الواجب الأول</li></ol><p><strong>موعد التسليم:</strong> </p>'},
 alert:{n:'⚠️ تنبيه',kind:'alert',title:'⚠️ تنبيه لجميع الطلاب',html:'<p>يا شباب، برجاء الانتباه للتعليمات التالية ⚠️</p><ul><li></li></ul>'},
 rem:{n:'⏰ موعد الدرس',kind:'reminder',title:'⏰ تذكير بموعد الدرس',html:'<p>تذكير مهم بموعد الحصة القادمة ⏰</p><p><strong>اليوم والموعد:</strong> </p>'},
 prep:{n:'📝 قبل الحصة',kind:'homework',title:'📝 المطلوب قبل الحصة',html:'<p>برجاء تنفيذ المطلوب قبل موعد الدرس 📚</p><ol><li></li></ol>'},
 week:{n:'📅 جدول الأسبوع',kind:'schedule',title:'📅 جدول الأسبوع',html:'<ul><li><strong>اليوم الأول:</strong> </li><li><strong>اليوم الثاني:</strong> </li></ul>'},
 pic:{n:'🖼️ خبر بصورة',kind:'general',title:'🖼️ خبر جديد',html:'<p>اكتب نص الخبر، ثم أضف الصورة بزر «صورة».</p>'},
 dec:{n:'📌 قرار مهم',kind:'decision',title:'📌 قرار مهم',html:'<p><strong>تقرر ما يلي:</strong></p><p></p>'},
 grp:{n:'📣 إعلان للمجموعة',kind:'announcement',title:'📣 إعلان خاص بالمجموعة',html:'<p>إلى طلاب المجموعة:</p><p></p>'}};
const PHR=['إعلان مهم من مستر هيثم الشبراوي 📢','يا شباب، برجاء الانتباه للتعليمات التالية ⚠️','تذكير مهم بموعد الحصة القادمة ⏰','برجاء تنفيذ المطلوب قبل موعد الدرس 📚'];
const NAV=[['home','الرئيسية'],['create','إنشاء خبر جديد'],['manage','إدارة الأخبار'],['students','مركز التحكم في الطلاب'],['inq','استفسارات الطلاب'],['settings','الإعدادات']];
async function boot(){try{const r=await api('GET','/api/me');if(r.kind==='admin')return shell(r.user)}catch(e){}login()}
function login(){root.innerHTML=`<header class="hero"><div class="brand">The Twins</div><p>دخول المشرف</p></header><main class="wrap"><form class="card" id="f"><label>اسم المستخدم</label><input name="username" required autocomplete="username" dir="ltr">
<label>كلمة المرور</label><input name="password" type="password" required autocomplete="current-password" dir="ltr"><button class="btn big">تسجيل الدخول</button></form></main>`;
 $('#f').onsubmit=async e=>{e.preventDefault();try{await api('POST','/api/admin/login',Object.fromEntries(new FormData(e.target)));boot()}catch(x){toast(x.message,false)}}}
async function shell(u){U=u;const s=await api('GET','/api/admin/stats');pend=s.pending;
 root.innerHTML=`<div class="layout"><nav class="side"><span class="brand">The Twins</span>${NAV.map(([k,t])=>`<button data-p="${k}" class="${k===page?'on':''}">${t}${k==='inq'&&pend?`<span class="badge">${pend}</span>`:''}</button>`).join('')}<button data-p="out">تسجيل الخروج</button></nav><main class="wrap" id="main" style="width:100%"></main></div>`;
 root.onclick=async e=>{const b=e.target.closest('[data-p]');if(!b)return;if(b.dataset.p==='out'){await api('POST','/api/logout');return location.reload()}page=b.dataset.p;if(page==='create'&&!b.dataset.keep)editing=null;shell(u)};
 ({home:()=>home(s),create:editor,manage:manage,students:students,inq:inquiries,settings:settings})[page]()}
const main=()=>$('#main');
function home(s){main().innerHTML=`<h1>مرحبًا يا إياد 👋</h1><p>جاهز تنظم أخبار النهارده؟</p><div class="stats"><div class="card"><b>${s.students}</b>إجمالي الطلاب</div><div class="card"><b>${s.news}</b>أخبار منشورة</div><div class="card"><b>${s.pending}</b>استفسارات بلا رد</div></div>
<div class="card"><span class="meta">آخر خبر منشور</span><br>${s.last?esc(s.last):'لا يوجد بعد'}</div><button class="btn big" data-p="create">هتعمل إيه النهارده يا إياد؟</button>`}
async function editor(){let n={title:'',body_html:'',kind:'general',target:'all',pinned:0};
 if(editing)n=(await api('GET','/api/admin/news/'+editing)).news;
 main().innerHTML=`<h2>${editing?'تعديل خبر':'إنشاء خبر جديد'}</h2><div class="card"><b>قوالب جاهزة (لا تُنشر تلقائيًا)</b><div class="row">${Object.entries(TPL).map(([k,t])=>`<button class="btn alt sm" data-t="${k}">${t.n}</button>`).join('')}</div></div>
<div class="card"><label>عنوان الخبر</label><input id="t" maxlength="150" value="${esc(n.title)}"><div class="row"><div><label>النوع</label><select id="k">${opts(KINDS,n.kind)}</select></div><div><label>المجموعة المستهدفة</label><select id="g">${opts(GROUPS,n.target)}</select></div>
<label><input type="checkbox" id="pin" style="width:auto"${n.pinned?' checked':''}> تثبيت أعلى صفحة الطلاب</label></div>
<div class="row" style="margin:10px 0"><button class="btn alt sm" data-c="bold">عريض</button><button class="btn alt sm" data-c="formatBlock" data-a="h3">عنوان فرعي</button><button class="btn alt sm" data-c="insertUnorderedList">قائمة</button><button class="btn alt sm" data-c="insertOrderedList">ترقيم</button><button class="btn alt sm" data-c="link">رابط</button><button class="btn alt sm" data-c="img">🖼️ صورة</button><input type="file" id="file" accept="image/*" hidden></div>
<div class="row" style="margin-bottom:8px">${PHR.map((p,i)=>`<button class="btn alt sm" data-ph="${i}">${p.slice(0,22)}…</button>`).join('')}</div>
<div class="editor" id="ed" contenteditable="true">${n.body_html}</div></div>
<div class="row"><button class="btn alt" data-s="preview">معاينة الخبر</button><button class="btn alt" data-s="draft">حفظ كمسودة</button><button class="btn green" data-s="published">نشر الخبر</button></div>`;
 const ed=$('#ed'),val=st=>({title:$('#t').value,kind:$('#k').value,target:$('#g').value,pinned:$('#pin').checked,body_html:ed.innerHTML,status:st});
 main().onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.t){const t=TPL[b.dataset.t];if((ed.textContent.trim()||$('#t').value)&&!confirm('سيحل القالب محل المحتوى الحالي. متابعة؟'))return;$('#t').value=t.title;$('#k').value=t.kind;ed.innerHTML=t.html}
  if(b.dataset.ph){ed.focus();document.execCommand('insertText',false,PHR[b.dataset.ph])}
  if(b.dataset.c){ed.focus();const c=b.dataset.c;if(c==='link'){const u=prompt('اكتب الرابط (يبدأ بـ https://)');if(u)document.execCommand('createLink',false,u)}else if(c==='img')$('#file').click();else document.execCommand(c,false,b.dataset.a||null)}
  if(b.dataset.s==='preview'){const v=val();modal(`<span class="chip ${v.kind==='urgent'?'urgent':''}">${KINDS[v.kind]}</span><h2>${esc(v.title)}</h2><div class="body">${v.body_html}</div><p class="meta">معاينة فقط — لم يُنشر شيء</p>`)}
  if(b.dataset.s==='draft'||b.dataset.s==='published'){const st=b.dataset.s;if(st==='published'&&!confirm('هل تريد نشر الخبر للطلاب الآن؟'))return;
   try{const r=editing?await api('PUT','/api/admin/news/'+editing,val(st)):await api('POST','/api/admin/news',val(st));editing=r.id||editing;toast(st==='published'?'تم نشر الخبر بنجاح ✅':'تم حفظ المسودة ✅')}catch(x){toast(x.message,false)}}};
 $('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;const fd=new FormData();fd.append('file',f);
  try{const r=await fetch('/api/admin/upload',{method:'POST',headers:{'X-Requested-With':'twins'},body:f}).then(async x=>{const d=await x.json();if(!x.ok)throw new Error(d.error||'فشل الرفع');return d});ed.focus();document.execCommand('insertImage',false,r.url);toast('تم رفع الصورة ✅')}catch(x){toast(x.message,false)}e.target.value=''}}
async function manage(){const el=main();el.innerHTML=`<h2>إدارة الأخبار</h2><div class="row card"><input id="q" placeholder="بحث بالعنوان"><select id="fk"><option value="">كل الأنواع</option>${opts(KINDS)}</select><select id="fs"><option value="">كل الحالات</option><option value="published">منشور</option><option value="draft">مسودة</option><option value="hidden">مخفي</option><option value="deleted">محذوف (استعادة)</option></select></div><div id="l"></div>`;
 const load=async()=>{const r=await api('GET',`/api/admin/news?q=${encodeURIComponent($('#q').value)}&kind=${$('#fk').value}&status=${$('#fs').value}`);
  $('#l').innerHTML=r.news.length?r.news.map(n=>`<div class="card"><b>${esc(n.title)}</b> <span class="chip ${n.kind==='urgent'?'urgent':''}">${KINDS[n.kind]}</span> <span class="chip">${n.deleted?'محذوف':n.status==='draft'?'مسودة':n.hidden?'مخفي':'منشور'}</span>${n.pinned?' <span class="chip">📌</span>':''}
  <div class="meta">${GROUPS[n.target]} — ${n.published_at?fmt(n.published_at):'لم يُنشر'}</div><div class="row" style="margin-top:6px">
  ${n.deleted?`<button class="btn sm green" data-f="${n.id}" data-k="deleted" data-v="0">استعادة</button>`:`<button class="btn sm" data-e="${n.id}">تعديل</button><button class="btn sm alt" data-pv="${n.id}">عرض</button>
  <button class="btn sm alt" data-f="${n.id}" data-k="hidden" data-v="${n.hidden?0:1}">${n.hidden?'إظهار':'إخفاء'}</button><button class="btn sm alt" data-f="${n.id}" data-k="pinned" data-v="${n.pinned?0:1}">${n.pinned?'إلغاء التثبيت':'تثبيت'}</button>
  <button class="btn sm red" data-f="${n.id}" data-k="deleted" data-v="1" data-cf="1">حذف</button>`}</div></div>`).join(''):'<div class="card">لا توجد أخبار مطابقة.</div>'};
 ['q','fk','fs'].forEach(i=>$('#'+i).oninput=load);load();
 el.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.e){editing=+b.dataset.e;page='create';return shell(U)}
  if(b.dataset.pv){const n=(await api('GET','/api/admin/news/'+b.dataset.pv)).news;modal(`<h2>${esc(n.title)}</h2><div class="body">${n.body_html}</div>`)}
  if(b.dataset.f){if(b.dataset.cf&&!confirm('حذف الخبر؟ يمكنك استعادته لاحقًا.'))return;await api('PATCH','/api/admin/news/'+b.dataset.f,{[b.dataset.k]:+b.dataset.v});toast('تم ✅');load()}}}
async function students(){const el=main();el.innerHTML=`<h2>مركز التحكم في الطلاب</h2><div class="card"><button class="btn" id="add">➕ إضافة طالب جديد</button> <span id="cnt" class="meta"></span><input id="q" placeholder="بحث بالاسم أو الرقم" style="margin-top:10px"></div><div id="l"></div>`;
 const load=async()=>{const r=await api('GET','/api/admin/students?q='+encodeURIComponent($('#q').value));$('#cnt').textContent=`عدد النتائج: ${r.total}`;
  $('#l').innerHTML=r.students.map(s=>`<div class="card row"><div style="flex:1 1 220px"><b>${esc(s.full_name)}</b><div class="meta" dir="ltr" style="text-align:right">${esc(s.phone)}</div><span class="chip">${GROUPS[s.group_key]}</span> <span class="chip ${s.active?'ok':'urgent'}">${s.active?'نشط':'موقوف'}</span></div>
  <button class="btn sm alt" data-ed='${JSON.stringify(s)}'>تعديل</button><button class="btn sm ${s.active?'red':'green'}" data-tg="${s.id}" data-a="${s.active?0:1}">${s.active?'إيقاف':'تفعيل'}</button></div>`).join('')};
 const form=s=>{const m=modal(`<h3>${s?'تعديل طالب':'إضافة طالب جديد'}</h3><form id="sf"><label>الاسم الثلاثي</label><input name="full_name" required value="${esc(s?.full_name)}"><label>رقم الموبايل</label><input name="phone" required dir="ltr" value="${esc(s?.phone)}"><label>المجموعة</label><select name="group_key">${opts({sat_tue:GROUPS.sat_tue,sun_wed:GROUPS.sun_wed},s?.group_key)}</select><button class="btn">حفظ</button></form>`);
  $('#sf').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{s?await api('PATCH','/api/admin/students/'+s.id,d):await api('POST','/api/admin/students',d);m.remove();toast('تم الحفظ ✅');load()}catch(x){toast(x.message,false)}}};
 $('#q').oninput=load;$('#add').onclick=()=>form();load();
 el.onclick=async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.ed)form(JSON.parse(b.dataset.ed));
  if(b.dataset.tg){await api('PATCH','/api/admin/students/'+b.dataset.tg,{active:+b.dataset.a});toast('تم ✅');load()}}}
async function inquiries(){const el=main();el.innerHTML='<h2>استفسارات الطلاب</h2><div id="l"></div>';
 const load=async()=>{const r=await api('GET','/api/admin/inquiries');$('#l').innerHTML=r.inquiries.length?r.inquiries.map(i=>`<div class="card"><b>${esc(i.title)}</b> <span class="chip ${i.status==='pending'?'urgent':'ok'}">${ST[i.status]}</span><div class="meta">${esc(i.full_name)} — ${fmt(i.created_at)}</div><p>${esc(i.body)}</p>
  ${i.reply?`<div class="card" style="background:#eef7f1">${esc(i.reply)}</div>`:''}<textarea rows="2" id="r${i.id}" placeholder="اكتب الرد"></textarea><div class="row"><button class="btn sm" data-r="${i.id}">إرسال الرد</button><button class="btn sm green" data-s="${i.id}">تم الحل</button></div></div>`).join(''):'<div class="card">لا توجد استفسارات بعد.</div>'};
 load();el.onclick=async e=>{const b=e.target.closest('button');if(!b)return;try{
  if(b.dataset.r)await api('PATCH','/api/admin/inquiries/'+b.dataset.r,{reply:$('#r'+b.dataset.r).value});
  if(b.dataset.s)await api('PATCH','/api/admin/inquiries/'+b.dataset.s,{status:'resolved'});toast('تم ✅');load()}catch(x){toast(x.message,false)}}}
function settings(){main().innerHTML=`<h2>الإعدادات</h2><form class="card" id="pf"><h3>تغيير كلمة المرور</h3><label>الحالية</label><input type="password" name="current" required><label>الجديدة (12 حرفًا على الأقل)</label><input type="password" name="new" minlength="12" required><button class="btn">حفظ</button></form>
<div class="card meta">المجموعتان: السبت والثلاثاء، والأحد والأربعاء. (تعديل أسماء المجموعات من الواجهة غير مُنفَّذ بعد.)</div>`;
 $('#pf').onsubmit=async e=>{e.preventDefault();try{await api('POST','/api/admin/password',Object.fromEntries(new FormData(e.target)));toast('تم تغيير كلمة المرور ✅');e.target.reset()}catch(x){toast(x.message,false)}}}
boot();
