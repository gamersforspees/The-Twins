const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {db,DB_PATH,checkPw,hashPw,normPhone,normName}=require('./lib');
const DATA=path.dirname(DB_PATH),UPLOADS=path.join(DATA,'uploads'),STATIC=path.join(__dirname,'static');
const SECRET=process.env.SECRET_KEY||(()=>{const f=path.join(DATA,'secret_key');if(!fs.existsSync(f))fs.writeFileSync(f,crypto.randomBytes(32).toString('hex'),{mode:0o600});return fs.readFileSync(f,'utf8')})();
const SECURE=process.env.COOKIE_SECURE==='1',MAXAGE=60*60*24*30;
const KINDS=new Set(['urgent','announcement','homework','alert','reminder','schedule','decision','general']),TARGETS=new Set(['all','sat_tue','sun_wed']),GROUPS=new Set(['sat_tue','sun_wed']);

// ---- جلسة موقّعة (HMAC) داخل كوكي HttpOnly ----
const sign=v=>crypto.createHmac('sha256',SECRET).update(v).digest('base64url');
const mkSession=(k,i)=>{const v=Buffer.from(JSON.stringify({k,i,e:Date.now()+MAXAGE*1000})).toString('base64url');return v+'.'+sign(v)};
function readSession(req){const m=/(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie||'');if(!m)return null;const [v,s]=m[1].split('.');if(!v||!s)return null;
 const a=Buffer.from(sign(v)),b=Buffer.from(s);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
 try{const d=JSON.parse(Buffer.from(v,'base64url'));return d.e>Date.now()?d:null}catch{return null}}
// يُعاد فحص المستخدم من قاعدة البيانات عند كل طلب (الإيقاف والصلاحية فوريان)
function current(req){const s=readSession(req);if(!s)return null;
 if(s.k==='admin'){const r=db.prepare("SELECT id,username FROM users WHERE id=? AND role='admin'").get(s.i);return r&&{kind:'admin',user:{...r}}}
 if(s.k==='student'){const r=db.prepare('SELECT id,full_name,group_key FROM students WHERE id=? AND active=1').get(s.i);return r&&{kind:'student',user:{...r}}}return null}
const tooMany=(b,limit=5,win=900)=>{const n=Math.floor(Date.now()/1000);db.prepare('DELETE FROM login_attempts WHERE ts<?').run(n-win);return db.prepare('SELECT COUNT(*) c FROM login_attempts WHERE bucket=? AND ts>?').get(b,n-win).c>=limit};
const fail=b=>db.prepare('INSERT INTO login_attempts(bucket,ts) VALUES(?,?)').run(b,Math.floor(Date.now()/1000));

// ---- تنظيف HTML: وسوم مسموحة فقط، وكل السمات الخطرة تُحذف ----
const OK=new Set(['p','br','h2','h3','strong','b','em','i','u','ul','ol','li','a','img','blockquote','div','span']),VOID=new Set(['br','img']);
const escT=s=>s.replace(/&(?!#?\w+;)/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),escA=s=>s.replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function cleanHtml(h){let out='',stack=[];
 for(const t of String(h||'').matchAll(/<\/?[a-zA-Z][^>]*>|[^<]+|</g)){const x=t[0];
  if(x[0]!=='<'||x==='<'){out+=x==='<'?'&lt;':escT(x);continue}
  const close=x[1]==='/',name=/^<\/?([a-zA-Z0-9]+)/.exec(x)[1].toLowerCase();if(!OK.has(name))continue;
  if(close){if(!VOID.has(name)&&stack.includes(name)){let y;do{y=stack.pop();out+=`</${y}>`}while(y!==name)}continue}
  const at={};for(const m of x.matchAll(/([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))at[m[1].toLowerCase()]=m[2]??m[3]??m[4]??'';
  let ex='';
  if(name==='a'){const u=(at.href||'').trim();if(!/^https?:\/\//i.test(u))continue;ex=` href="${escA(u)}" target="_blank" rel="noopener noreferrer"`}
  if(name==='img'){if(!/^\/media\/[0-9a-f]{32}\.(png|jpg|gif|webp)$/.test(at.src||''))continue;ex=` src="${at.src}" alt=""`}
  out+=`<${name}${ex}>`;if(!VOID.has(name))stack.push(name)}
 return out+stack.reverse().map(s=>`</${s}>`).join('')}
const sniff=b=>b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))?'png':b[0]===0xff&&b[1]===0xd8&&b[2]===0xff?'jpg':/^GIF8[79]a/.test(b.subarray(0,6).toString('latin1'))?'gif':b.subarray(0,4).toString('latin1')==='RIFF'&&b.subarray(8,12).toString('latin1')==='WEBP'?'webp':null;

// ---- الموجّه ----
const routes=[];const R=(m,p,role,fn)=>routes.push({m,role,fn,re:new RegExp('^'+p.replace(/:(\w+)/g,'(?<$1>[^/]+)')+'$')});
const E=(s,m)=>[s,{error:m}],ok=(o={})=>[200,{ok:true,...o}];
const sgn=(res,v,age)=>res.setHeader('Set-Cookie',`sid=${v}; HttpOnly; SameSite=Lax; Path=/${age?`; Max-Age=${age}`:'; Max-Age=0'}${SECURE?'; Secure':''}`);

R('POST','/api/admin/login',null,c=>{const b='admin:'+c.ip;if(tooMany(b))return E(429,'محاولات كثيرة. حاول بعد 15 دقيقة.');
 const u=db.prepare("SELECT * FROM users WHERE username=? AND role='admin'").get(String(c.body.username??''));
 if(!u||!checkPw(String(c.body.password??''),u.password_hash)){fail(b);return E(401,'اسم المستخدم أو كلمة المرور غير صحيحة.')}
 sgn(c.res,mkSession('admin',u.id),MAXAGE);return ok()});
R('POST','/api/student/login',null,c=>{const b='stu:'+c.ip;if(tooMany(b,8))return E(429,'محاولات كثيرة. حاول بعد 15 دقيقة.');
 const s=db.prepare('SELECT * FROM students WHERE phone=? AND name_norm=? AND active=1').get(normPhone(c.body.phone),normName(c.body.name));
 if(!s){fail(b);return E(401,'عذرًا، بياناتك غير مسجلة ضمن الطلاب المسموح لهم بالدخول إلى المنصة. يُرجى مراجعة المشرف.')}
 sgn(c.res,mkSession('student',s.id),MAXAGE);return ok({name:s.full_name})});
R('POST','/api/logout',null,c=>{sgn(c.res,'',0);return ok()});
R('GET','/api/me',null,c=>{const x=current(c.req);return x?[200,x]:E(401,'غير مسجل')});

// الطلاب (مشرف)
const cleanStu=d=>{const name=String(d.full_name??'').split(/\s+/).filter(Boolean).join(' '),phone=normPhone(d.phone);
 if(name.split(' ').length<3||name.length>80)return[null,'اكتب الاسم الثلاثي كاملًا.'];if(phone.length<10||phone.length>15)return[null,'رقم الموبايل غير صحيح.'];
 if(!GROUPS.has(d.group_key))return[null,'اختر المجموعة.'];return[[name,normName(name),phone,d.group_key],null]};
R('GET','/api/admin/students','admin',c=>{const q='%'+(c.url.searchParams.get('q')||'')+'%';
 const rows=db.prepare('SELECT id,full_name,phone,group_key,active FROM students WHERE full_name LIKE ? OR phone LIKE ? ORDER BY id DESC').all(q,q).map(r=>({...r}));return[200,{students:rows,total:rows.length}]});
R('POST','/api/admin/students','admin',c=>{const[v,e]=cleanStu(c.body);if(e)return E(400,e);
 if(db.prepare('SELECT 1 FROM students WHERE phone=?').get(v[2]))return E(409,'هذا الرقم مسجل من قبل.');
 db.prepare('INSERT INTO students(full_name,name_norm,phone,group_key) VALUES(?,?,?,?)').run(...v);return[201,{ok:true}]});
R('PATCH','/api/admin/students/:id','admin',c=>{const id=+c.params.id,d=c.body;
 if('active' in d&&Object.keys(d).length===1){db.prepare('UPDATE students SET active=? WHERE id=?').run(d.active?1:0,id);return ok()}
 const[v,e]=cleanStu(d);if(e)return E(400,e);if(db.prepare('SELECT 1 FROM students WHERE phone=? AND id<>?').get(v[2],id))return E(409,'هذا الرقم مسجل لطالب آخر.');
 db.prepare('UPDATE students SET full_name=?,name_norm=?,phone=?,group_key=? WHERE id=?').run(...v,id);return ok()});

// الأخبار (مشرف)
const newsFields=(d,pub)=>{const title=String(d.title??'').split(/\s+/).filter(Boolean).join(' '),body=cleanHtml(String(d.body_html??'').slice(0,60000));
 if(!title||title.length>150)return[null,'اكتب عنوانًا (حتى 150 حرفًا).'];if(!KINDS.has(d.kind))return[null,'نوع الخبر غير صحيح.'];if(!TARGETS.has(d.target))return[null,'اختر المجموعة المستهدفة.'];
 if(pub&&!body.replace(/<[^>]+>|\s/g,'')&&!body.includes('<img'))return[null,'اكتب محتوى الخبر قبل النشر.'];return[[title,body,d.kind,d.target,d.pinned?1:0],null]};
R('POST','/api/admin/news','admin',c=>{const pub=c.body.status==='published',[v,e]=newsFields(c.body,pub);if(e)return E(400,e);
 const r=db.prepare('INSERT INTO news(title,body_html,kind,target,pinned,status,published_at) VALUES(?,?,?,?,?,?,CASE WHEN ?=1 THEN CURRENT_TIMESTAMP END)').run(...v,pub?'published':'draft',pub?1:0);return[201,{ok:true,id:Number(r.lastInsertRowid)}]});
R('GET','/api/admin/news','admin',c=>{const p=c.url.searchParams,w=['title LIKE ?'],a=['%'+(p.get('q')||'')+'%'],k=p.get('kind'),st=p.get('status');
 if(KINDS.has(k)){w.push('kind=?');a.push(k)}
 if(st==='deleted')w.push('deleted=1');else{w.push('deleted=0');if(st==='draft'||st==='published'){w.push('status=?');a.push(st)}if(st==='hidden')w.push('hidden=1')}
 return[200,{news:db.prepare('SELECT id,title,kind,status,hidden,pinned,deleted,target,created_at,published_at FROM news WHERE '+w.join(' AND ')+' ORDER BY id DESC').all(...a).map(r=>({...r}))}]});
R('GET','/api/admin/news/:id','admin',c=>{const r=db.prepare('SELECT * FROM news WHERE id=?').get(+c.params.id);return r?[200,{news:{...r}}]:E(404,'غير موجود')});
R('PUT','/api/admin/news/:id','admin',c=>{const pub=c.body.status==='published',[v,e]=newsFields(c.body,pub);if(e)return E(400,e);
 if(!db.prepare('SELECT 1 FROM news WHERE id=? AND deleted=0').get(+c.params.id))return E(404,'غير موجود');
 db.prepare("UPDATE news SET title=?,body_html=?,kind=?,target=?,pinned=?,status=?,published_at=CASE WHEN ?=1 AND published_at IS NULL THEN CURRENT_TIMESTAMP ELSE published_at END WHERE id=?").run(...v,pub?'published':'draft',pub?1:0,+c.params.id);return ok()});
R('PATCH','/api/admin/news/:id','admin',c=>{const cols=['hidden','pinned','deleted'].filter(k=>k in c.body);if(!cols.length)return E(400,'لا توجد تغييرات');
 db.prepare('UPDATE news SET '+cols.map(k=>k+'=?').join(',')+' WHERE id=?').run(...cols.map(k=>c.body[k]?1:0),+c.params.id);return ok()});
R('POST','/api/admin/upload','admin',c=>{const b=c.raw;if(!b||!b.length)return E(400,'لم يتم اختيار ملف.');if(b.length>4*1024*1024)return E(413,'الصورة أكبر من 4 ميجابايت.');
 const ext=sniff(b);if(!ext)return E(400,'الملف ليس صورة مدعومة (PNG, JPG, GIF, WEBP).');fs.mkdirSync(UPLOADS,{recursive:true});
 const n=crypto.randomBytes(16).toString('hex')+'.'+ext;fs.writeFileSync(path.join(UPLOADS,n),b);return[201,{url:'/media/'+n}]});

// الطالب
const VIS="n.status='published' AND n.hidden=0 AND n.deleted=0 AND n.target IN ('all',?)";
R('GET','/api/student/news','student',c=>[200,{news:db.prepare('SELECT n.id,n.title,n.kind,n.body_html,n.pinned,n.published_at,(r.news_id IS NOT NULL) AS is_read FROM news n LEFT JOIN news_reads r ON r.news_id=n.id AND r.student_id=? WHERE '+VIS+' ORDER BY n.pinned DESC,n.published_at DESC,n.id DESC').all(c.me.id,c.me.group_key).map(r=>({...r,is_read:+r.is_read}))}]);
R('POST','/api/student/news/:id/read','student',c=>{if(db.prepare('SELECT 1 FROM news n WHERE n.id=? AND '+VIS).get(+c.params.id,c.me.group_key))db.prepare('INSERT OR IGNORE INTO news_reads VALUES(?,?)').run(c.me.id,+c.params.id);return ok()});
R('POST','/api/student/inquiries','student',c=>{const t=String(c.body.title??'').split(/\s+/).filter(Boolean).join(' '),b=String(c.body.body??'').trim();
 if(!t||t.length>120||!b||b.length>3000)return E(400,'اكتب عنوانًا وتفاصيل للاستفسار.');db.prepare('INSERT INTO inquiries(student_id,title,body) VALUES(?,?,?)').run(c.me.id,t,b);return[201,{ok:true}]});
R('GET','/api/student/inquiries','student',c=>[200,{inquiries:db.prepare('SELECT id,title,body,status,reply,replied_at,created_at FROM inquiries WHERE student_id=? ORDER BY id DESC').all(c.me.id).map(r=>({...r}))}]);
R('GET','/api/admin/inquiries','admin',c=>{const st=c.url.searchParams.get('status')||'';return[200,{inquiries:db.prepare("SELECT i.*,s.full_name FROM inquiries i JOIN students s ON s.id=i.student_id WHERE (?='' OR i.status=?) ORDER BY (i.status='pending') DESC,i.id DESC").all(st,st).map(r=>({...r}))}]});
R('PATCH','/api/admin/inquiries/:id','admin',c=>{const reply=String(c.body.reply??'').trim().slice(0,3000),st=c.body.status;
 if(st!=null&&!['pending','replied','resolved'].includes(st))return E(400,'حالة غير صحيحة');
 if(reply)db.prepare('UPDATE inquiries SET reply=?,replied_at=CURRENT_TIMESTAMP,status=? WHERE id=?').run(reply,st||'replied',+c.params.id);
 else if(st)db.prepare('UPDATE inquiries SET status=? WHERE id=?').run(st,+c.params.id);else return E(400,'اكتب ردًا أو غيّر الحالة.');return ok()});
R('GET','/api/admin/stats','admin',()=>{const n=q=>db.prepare(q).get().c,l=db.prepare("SELECT title FROM news WHERE status='published' AND deleted=0 ORDER BY published_at DESC,id DESC LIMIT 1").get();
 return[200,{students:n('SELECT COUNT(*) c FROM students'),news:n("SELECT COUNT(*) c FROM news WHERE status='published' AND deleted=0"),pending:n("SELECT COUNT(*) c FROM inquiries WHERE status='pending'"),last:l?l.title:null}]});
R('POST','/api/admin/password','admin',c=>{const u=db.prepare('SELECT password_hash FROM users WHERE id=?').get(c.me.id);
 if(!checkPw(String(c.body.current??''),u.password_hash))return E(400,'كلمة المرور الحالية غير صحيحة.');if(String(c.body.new??'').length<12)return E(400,'كلمة المرور الجديدة 12 حرفًا على الأقل.');
 db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPw(c.body.new),c.me.id);return ok()});

// ---- الملفات والصفحات ----
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'};
function sendFile(res,f,cache){fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':cache||'no-cache'});res.end(d)})}
function handle(req,res){
 const send=(s,o)=>{const b=JSON.stringify(o);res.writeHead(s,{'Content-Type':'application/json; charset=utf-8'});res.end(b)};
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'");
 const url=new URL(req.url,'http://x'),p=url.pathname,ip=req.socket.remoteAddress||'';
 if(req.method==='GET'){
  if(p==='/')return sendFile(res,path.join(STATIC,'index.html'));if(p==='/admin')return sendFile(res,path.join(STATIC,'admin.html'));
  if(p.startsWith('/static/'))return sendFile(res,path.join(STATIC,path.basename(p)));
  const m=/^\/media\/([0-9a-f]{32}\.(png|jpg|gif|webp))$/.exec(p);   // الصور للمسجلين فقط
  if(m){if(!current(req)){res.writeHead(401);return res.end()}return sendFile(res,path.join(UPLOADS,m[1]),'private, max-age=3600')}
 }
 if(req.method!=='GET'&&req.headers['x-requested-with']!=='twins')return send(403,{error:'طلب مرفوض'});   // حماية CSRF
 const r=routes.find(x=>x.m===req.method&&x.re.test(p));if(!r)return send(404,{error:'غير موجود'});
 const chunks=[];let size=0,dead=false;
 req.on('data',d=>{size+=d.length;if(size>5*1024*1024&&!dead){dead=true;send(413,{error:'الملف كبير جدًا.'});req.destroy()}else if(!dead)chunks.push(d)});
 req.on('end',()=>{if(dead)return;try{
  const ctx={req,res,url,ip,params:r.re.exec(p).groups||{},raw:Buffer.concat(chunks),body:{}};
  if((req.headers['content-type']||'').includes('json')&&ctx.raw.length){try{ctx.body=JSON.parse(ctx.raw)}catch{return send(400,{error:'بيانات غير صالحة'})}}
  if(r.role){const cur=current(req);if(!cur){sgn(res,'',0);return send(401,{error:'غير مصرح'})}if(cur.kind!==r.role)return send(403,{error:'ليست لديك صلاحية'});ctx.me=cur.user}
  const[s,o]=r.fn(ctx);send(s,o)}catch(e){console.error(e);send(500,{error:'خطأ في الخادم'})}})}
const server=http.createServer(handle);
if(require.main===module)server.listen(+(process.env.PORT||5000),'127.0.0.1',()=>console.log('The Twins يعمل على http://127.0.0.1:'+(process.env.PORT||5000)));
module.exports={server};
