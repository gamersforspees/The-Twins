const {DatabaseSync}=require('node:sqlite'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const DB_PATH=process.env.TWINS_DB||path.join(__dirname,'data','twins.db');
fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});
const db=new DatabaseSync(DB_PATH);db.exec('PRAGMA foreign_keys=ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','student')),created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY,full_name TEXT NOT NULL,name_norm TEXT NOT NULL,phone TEXT NOT NULL UNIQUE,group_key TEXT NOT NULL CHECK(group_key IN ('sat_tue','sun_wed')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS login_attempts(id INTEGER PRIMARY KEY,bucket TEXT NOT NULL,ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS news(id INTEGER PRIMARY KEY,title TEXT NOT NULL,body_html TEXT NOT NULL DEFAULT '',kind TEXT NOT NULL DEFAULT 'general',status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),hidden INTEGER NOT NULL DEFAULT 0,pinned INTEGER NOT NULL DEFAULT 0,deleted INTEGER NOT NULL DEFAULT 0,target TEXT NOT NULL DEFAULT 'all' CHECK(target IN ('all','sat_tue','sun_wed')),created_at TEXT DEFAULT CURRENT_TIMESTAMP,published_at TEXT);
CREATE TABLE IF NOT EXISTS news_reads(student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,PRIMARY KEY(student_id,news_id));
CREATE TABLE IF NOT EXISTS inquiries(id INTEGER PRIMARY KEY,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,title TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','replied','resolved')),reply TEXT,replied_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
const hashPw=p=>{const s=crypto.randomBytes(16);return `scrypt$${s.toString('hex')}$${crypto.scryptSync(p,s,64).toString('hex')}`};
const checkPw=(p,st)=>{const [a,s,h]=String(st).split('$');if(a!=='scrypt')return false;const x=crypto.scryptSync(p,Buffer.from(s,'hex'),64),y=Buffer.from(h,'hex');return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const normPhone=p=>String(p??'').replace(/[\u0660-\u0669]/g,c=>c.charCodeAt(0)-0x660).replace(/[\u06F0-\u06F9]/g,c=>c.charCodeAt(0)-0x6F0).replace(/\D/g,'');
const normName=n=>String(n??'').replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').split(/\s+/).filter(Boolean).join(' ').toLowerCase();
module.exports={db,DB_PATH,hashPw,checkPw,normPhone,normName};
