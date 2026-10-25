// Create the admin account (terminal only):  npm run create-admin
const {db,hashPw}=require('./lib');const readline=require('readline');
if(process.argv[2]!=='create-admin'){console.log('Usage: npm run create-admin');process.exit(0)}
const rl=readline.createInterface({input:process.stdin,output:process.stdout,terminal:!!process.stdin.isTTY});
let muted=false;rl._writeToOutput=s=>{if(!muted)process.stdout.write(s)};   // hide password while typing
const lines=[],waiting=[];rl.on('line',l=>waiting.length?waiting.shift()(l):lines.push(l));
const ask=(p,hide)=>{process.stdout.write(p);muted=!!hide;return new Promise(r=>lines.length?r(lines.shift()):waiting.push(r)).then(a=>{if(hide){muted=false;process.stdout.write('\n')}return a})};
const askValid=async(p,ok,msg,hide)=>{for(;;){const a=await ask(p,hide);if(ok(a))return a;console.log(msg)}};
(async()=>{
 if(db.prepare("SELECT 1 FROM users WHERE role='admin'").get()){console.log('An admin already exists. Setup is closed. (يوجد مشرف بالفعل)');process.exit(1)}
 console.log('Create the admin account. Type the value and press Enter.\n(Arabic text may look scrambled in cmd - that is normal.)\n');
 const u=(await askValid('Username (3-32 letters/numbers, e.g. eyad_admin): ',a=>/^[A-Za-z0-9_.-]{3,32}$/.test(a.trim()),'  -> Invalid username. Use English letters, numbers, _ . - only. Try again.')).trim();
 for(;;){
  const p=await askValid('Password (at least 12 characters, you will not see it): ',a=>a.length>=12,'  -> Too short. Use at least 12 characters.',true);
  if(p!==await ask('Repeat the password: ',true)){console.log('  -> Passwords do not match. Try again.');continue}
  db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?,'admin')").run(u,hashPw(p));
  console.log('\nDone. Admin account created: '+u+'\nNow run:  npm start');process.exit(0)}
})();
