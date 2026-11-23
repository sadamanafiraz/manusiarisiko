import { database } from '../database';
import { CASE_SHEETS, CONTEXT_COLUMNS, profileRows, applyProfileRows } from './case-spec.mjs';
import { BUILTIN_ID, builtinCase, emptyCase, normalizeBank, validateCase, MAX_CASE_BYTES } from './case-bank';
import { readCaseWorkbook, writeCaseWorkbook } from './case-excel';
import type { Identity } from './handler';
const db=database;
const one=async(sql:string,...args:any[])=>db().prepare(sql).bind(...args).first<any>();
const fail=(message:string,status=400)=>{throw Object.assign(new Error(message),{status})};
const json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const summary=(r:any)=>({id:r.id,title:r.title,description:r.description,status:r.status,version:r.version,createdAt:r.created_at,updatedAt:r.updated_at,publishedAt:r.published_at});
const builtSummary=()=>({id:BUILTIN_ID,title:builtinCase()._meta.title,description:builtinCase()._meta.description,status:'published',version:builtinCase()._meta.version,builtin:true});
async function owned(id:string,owner:string){const r=await one('SELECT * FROM risk_case_packages WHERE id=? AND owner=?',id,owner);if(!r)fail('Paket kasus tidak ditemukan.',404);return r;}
export async function selectedCase(id:string|undefined,owner:string){
 if(!id||id===BUILTIN_ID)return {id:BUILTIN_ID,bank:builtinCase()};
 const r=await owned(id,owner);if(r.status!=='published')fail('Terbitkan paket kasus sebelum memilihnya untuk kelas.',409);return {id:r.id,bank:JSON.parse(r.bank_json)};
}
export async function handleCases(req:Request,identity:Identity|null){
 if(!identity)fail('Silakan login sebagai pengajar.',401);if(!identity!.isTeacher)fail('Akun ini belum terdaftar sebagai pengajar.',403);
 const owner=identity!.id,url=new URL(req.url),path=url.pathname.replace('/api/cases','').split('/').filter(Boolean),method=req.method;
 const download=async(bank:any)=>new Response(new Uint8Array(await writeCaseWorkbook(bank)),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="Riskman_${String(bank._meta.code||'Template').replace(/[^a-z0-9-]/gi,'')}.xlsx"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(method==='GET'&&path[0]==='template')return download(url.searchParams.get('type')==='blank'?emptyCase():builtinCase());
 if(method==='GET'&&!path.length){const rows=(await db().prepare('SELECT id,title,description,status,version,created_at,published_at FROM risk_case_packages WHERE owner=? ORDER BY created_at DESC').bind(owner).all<any>()).results;return json({cases:[builtSummary(),...rows.map(summary)]});}
 if(method==='GET'&&path[0]===BUILTIN_ID)return path[1]==='excel'?download(builtinCase()):json({case:builtSummary(),bank:builtinCase(),issues:[],sheets:[{name:'Profil_Kasus',key:'Konteks_Program',columns:CONTEXT_COLUMNS},...CASE_SHEETS],profile:profileRows(builtinCase())});
 let body:any={};if(method!=='GET'&&path[0]!=='import'){
  if(!req.headers.get('content-type')?.includes('application/json'))fail('Gunakan JSON.',415);
  if(Number(req.headers.get('content-length')||0)>MAX_CASE_BYTES+20000)fail('Data kasus terlalu besar.',413);
  const raw=await req.text();if(raw.length>MAX_CASE_BYTES+20000)fail('Data kasus terlalu besar.',413);try{body=JSON.parse(raw);}catch{fail('Format permintaan tidak valid.');}if(!body||typeof body!=='object'||Array.isArray(body))fail('Data tidak valid.');
 }
 if(method==='POST'&&(!path.length||path[0]==='import')){
  let bank:any;
  if(path[0]==='import'){
   if(!req.headers.get('content-type')?.includes('multipart/form-data'))fail('Pilih berkas Excel .xlsx.',415);
   if(Number(req.headers.get('content-length')||0)>2100000)fail('Berkas maksimal 2 MB.',413);
   const bytes=await req.arrayBuffer();if(bytes.byteLength>2100000)fail('Berkas maksimal 2 MB.',413);
   const form=await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')!},body:bytes}).formData();const file=form.get('file');
   if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.xlsx'))fail('Pilih berkas Excel .xlsx.');
   try{bank=await readCaseWorkbook(Buffer.from(await (file as File).arrayBuffer()));}catch(e:any){fail(e.message);}
  }else if(body.copyFrom){const original=body.copyFrom===BUILTIN_ID?builtinCase():JSON.parse((await owned(String(body.copyFrom),owner)).bank_json);bank=normalizeBank(original);bank._meta.title=(bank._meta.title+' — salinan').slice(0,100);}
  else {if(typeof body.title!=='string'||body.title.trim().length<3||body.title.length>100)fail('Judul kasus 3–100 karakter.');bank=emptyCase(body.title.trim());}
  const id=crypto.randomUUID(),version='case-'+crypto.randomUUID(),now=new Date().toISOString();bank._meta.version=version;
  await db().prepare('INSERT INTO risk_case_packages(id,owner,title,description,status,bank_json,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,owner,bank._meta.title,bank._meta.description,'draft',JSON.stringify(bank),version,now,now).run();
  return json({id,issues:validateCase(bank)},201);
 }
 if(path[0]){
  const r=await owned(path[0],owner),bank=JSON.parse(r.bank_json);
  if(method==='GET'&&path[1]==='excel')return download(bank);
  if(method==='GET'&&path.length===1)return json({case:summary(r),bank,issues:validateCase(bank),sheets:[{name:'Profil_Kasus',key:'Konteks_Program',columns:CONTEXT_COLUMNS},...CASE_SHEETS],profile:profileRows(bank)});
  if(method==='PATCH'&&path.length===1){
   if(r.status!=='draft')fail('Versi terbit tidak dapat diubah. Buat salinan untuk revisi.',409);
   if(body.expectedVersion!==r.updated_at)fail('Draf berubah di tab lain. Muat ulang sebelum menyimpan.',409);
   let next;try{next=normalizeBank(body.bank);if(body.profile)applyProfileRows(next,body.profile);next=normalizeBank(next);}catch(e:any){fail(e.message);}
   next!._meta.version=r.version;const now=new Date(Math.max(Date.now(),Date.parse(r.updated_at)+1)).toISOString();
   const saved=await db().prepare('UPDATE risk_case_packages SET title=?,description=?,bank_json=?,updated_at=? WHERE id=? AND owner=? AND status=\'draft\' AND updated_at=?').bind(next!._meta.title,next!._meta.description,JSON.stringify(next),now,r.id,owner,r.updated_at).run();if(!saved.meta.changes)fail('Draf berubah. Muat ulang sebelum menyimpan.',409);
   return json({saved:true,updatedAt:now,issues:validateCase(next!)});
  }
  if(method==='POST'&&path[1]==='publish'){
   if(r.status==='published')return json({published:true});const issues=validateCase(bank);if(issues.length)return json({error:'Perbaiki isian sebelum menerbitkan kasus.',issues},422);
   const now=new Date().toISOString();const published=await db().prepare("UPDATE risk_case_packages SET status='published',published_at=?,updated_at=? WHERE id=? AND owner=? AND status='draft' AND updated_at=?").bind(now,now,r.id,owner,r.updated_at).run();if(!published.meta.changes)fail('Draf berubah. Muat ulang sebelum menerbitkan.',409);return json({published:true});
  }
 }
 return json({error:'Halaman kasus tidak ditemukan.'},404);
}
