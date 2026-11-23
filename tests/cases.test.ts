import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { builtinCase, emptyCase, normalizeBank, validateCase } from '../lib/riskman/case-bank';
import { writeCaseWorkbook, readCaseWorkbook } from '../lib/riskman/case-excel';
import { emptyState } from '../lib/riskman/scoring.mjs';
export async function runCaseTests({handle,db}:any){
 const teacher={id:'case-teacher',name:'Pengajar Uji',isTeacher:true},other={...teacher,id:'other-teacher'};
 async function call(path:string,method='GET',body?:any,status=200,identity:any=teacher,cookie?:string){
  const r=await handle(new Request('https://riskman.test/api/'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)}),identity);
  const d=await r.json();assert.equal(r.status,status,path+': '+JSON.stringify(d).slice(0,200));return {r,d};
 }
 const built=builtinCase();assert.deepEqual(validateCase(built),[]);assert.ok(validateCase(emptyCase()).length>0);
 const bytes=await writeCaseWorkbook(built),roundtrip=await readCaseWorkbook(bytes);assert.deepEqual(validateCase(roundtrip),[]);assert.equal(roundtrip.Berita_Bukti[0][4],built.Berita_Bukti[0][4]);
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes as any);wb.getWorksheet('Kunci_Penilaian')!.getCell('D2').value={formula:'2+2',result:4};await assert.rejects(readCaseWorkbook(Buffer.from(await wb.xlsx.writeBuffer())),/formula/);
 await assert.rejects(readCaseWorkbook(Buffer.from('not a zip')),/bukan Excel/);
 const missing=new ExcelJS.Workbook();missing.addWorksheet('Profil_Kasus');await assert.rejects(readCaseWorkbook(Buffer.from(await missing.xlsx.writeBuffer())),/header harus/);
 await call('cases','GET',undefined,401,null);await call('cases','GET',undefined,403,{id:'x',name:'Peserta',isTeacher:false});
 assert.ok((await call('cases')).d.cases.some((c:any)=>c.builtin));
 const draft=(await call('cases','POST',{copyFrom:'builtin-water'},201)).d.id;
 await call('cases/'+draft,'GET',undefined,404,other);
 await call('classes','POST',{title:'Draf belum boleh dipakai',mode:'specialist',caseId:draft,groups:[{name:'Kota Uji'}]},409);
 let detail=(await call('cases/'+draft)).d;let serialized=JSON.stringify(normalizeBank(detail.bank));
 for(const [old,next] of [['BAPPEDA','DINKES'],['BPKAD','DINSOS'],['PDAM','BPBD'],['PU','DISDIK']])serialized=serialized.replaceAll(old,next);
 const custom=JSON.parse(serialized);custom._meta.title='Kasus Lintas Instansi';custom._meta.code='lintas-instansi';custom._meta.description='Paket pengujian instansi dinamis';for(const p of custom.Profil_OPD)p[1]='Instansi '+p[0];custom.secretAnswers='must never be exposed';
 let changed=await call('cases/'+draft,'PATCH',{bank:custom,expectedVersion:detail.case.updatedAt});assert.deepEqual(changed.d.issues,[]);
 await call('cases/'+draft,'PATCH',{bank:custom,expectedVersion:detail.case.updatedAt},409);detail=(await call('cases/'+draft)).d;assert.equal(detail.bank.secretAnswers,undefined);
 const bad=structuredClone(custom);bad.Kunci_Risiko[0][5]=25;bad.Kunci_Risiko[1][13]=bad.Kunci_Risiko[0][13];assert.ok(validateCase(bad).some(e=>e.column==='Skor'));assert.ok(validateCase(bad).some(e=>e.column==='Urutan_prioritas'));
 changed=await call('cases/'+draft,'PATCH',{bank:bad,expectedVersion:detail.case.updatedAt});assert.ok(changed.d.issues.length);await call('cases/'+draft+'/publish','POST',{},422);detail=(await call('cases/'+draft)).d;
 await call('cases/'+draft,'PATCH',{bank:custom,expectedVersion:detail.case.updatedAt});await call('cases/'+draft+'/publish','POST',{});await call('cases/'+draft,'PATCH',{bank:custom,expectedVersion:changed.d.updatedAt},409);
 await call('classes','POST',{title:'Inter-tenant rejected',mode:'specialist',caseId:draft,groups:[{name:'Kota Uji'}]},404,other);
 for(const mode of ['specialist','assurer']){
  const cl=(await call('classes','POST',{title:'Uji kasus '+mode,mode,caseId:draft,groups:[{name:'Kota Dinamis'}]},201)).d;
  const lookup=(await call('lookup','POST',{code:cl.code},200,null)).d;assert.deepEqual(lookup.groups[0].assignments.map((a:any)=>a.opd),['DINKES','DINSOS','DISDIK','BPBD']);
  for(const seat of lookup.groups[0].assignments){
   const joined=await call('join','POST',{code:cl.code,groupId:seat.id},200,null),cookie=joined.r.headers.get('set-cookie')!.split(';')[0];
   const boot=(await call('groups/'+seat.id,'GET',undefined,200,null,cookie)).d;assert.equal(boot.bank._meta.title,'Kasus Lintas Instansi');assert.equal(boot.bank._meta.builtin,false);assert.equal(boot.bank.secretAnswers,undefined);assert.equal(boot.bank.Berita_Bukti.length,10);assert.ok(boot.bank.Kunci_Risiko.every((r:any[])=>r[1]===seat.opd&&r[3]===null));assert.ok(boot.bank.Bank_Mitigasi.every((r:any[])=>r[11]===null));
   const state:any=emptyState();state.locked=true;state.mitConfirmed=true;state.selected=custom.Bank_Pernyataan.filter((r:any[])=>r[1]===seat.opd&&r[4]===1).map((r:any[])=>r[0]);
   for(const r of custom.Kunci_Risiko.filter((r:any[])=>r[1]===seat.opd)){state.answers[r[0]]={k:r[3],d:r[4],control:r[7],effect:r[8],kr:r[9],dr:r[10],handle:r[12],rank:r[13]};if(r[12])state.mitigation[r[0]]=r[14];}
   for(const r of custom.Kunci_Assurer.filter((r:any[])=>r[2]===seat.opd))state.reviews[r[0]]={diagnosis:r[5],evidence:r[7],rec:r[8]};
   const result=(await call('groups/'+seat.id+'/submit','POST',{revision:boot.revision,state},200,null,cookie)).d.result;assert.equal(result.mri,5);assert.equal(result.errors.length,0);assert.ok(result.bankVersion.startsWith('case-'));
  }
  const dashboard=(await call('classes/'+cl.id)).d;assert.equal(dashboard.groups[0].result.mri,5);assert.equal(dashboard.class.case_title,'Kasus Lintas Instansi');assert.equal(dashboard.class.case_snapshot,undefined);
 }
 const revision=(await call('cases','POST',{copyFrom:draft},201)).d.id;let rev=(await call('cases/'+revision)).d;rev.bank._meta.title='Versi berikutnya';await call('cases/'+revision,'PATCH',{bank:rev.bank,expectedVersion:rev.case.updatedAt});
 const pinned=await db.execute({sql:'SELECT case_snapshot FROM risk_classes WHERE case_id=?',args:[draft]});assert.ok(pinned.rows.every((r:any)=>JSON.parse(r.case_snapshot)._meta.title==='Kasus Lintas Instansi'));
 const fileResponse=await handle(new Request('https://riskman.test/api/cases/'+draft+'/excel'),teacher);assert.equal(fileResponse.status,200);assert.match(fileResponse.headers.get('content-type'),/spreadsheetml/);assert.deepEqual(validateCase(await readCaseWorkbook(Buffer.from(await fileResponse.arrayBuffer()))),[]);
 const form=new FormData();form.append('file',new File([new Uint8Array(bytes)],'kasus.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const uploaded=await handle(new Request('https://riskman.test/api/cases/import',{method:'POST',body:form}),teacher);assert.equal(uploaded.status,201);assert.deepEqual((await uploaded.json()).issues,[]);
 assert.equal((await handle(new Request('https://riskman.test/api/cases/import',{method:'POST',body:new FormData()}),null)).status,401);
 assert.equal((await handle(new Request('https://riskman.test/api/cases',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://evil.test'},body:'{}'}),teacher)).status,403);
 const legacy=(await call('classes','POST',{title:'Legacy compatibility',mode:'specialist',groups:[{name:'Kota Lama'}]},201)).d;await db.execute({sql:'UPDATE risk_classes SET case_id=NULL,case_snapshot=NULL WHERE id=?',args:[legacy.id]});assert.equal((await call('classes/'+legacy.id)).d.class.case_title,built._meta.title);
 console.log('PASS Excel round-trip, multipart import, formulas/headers rejected, draft validation, owner authorization, immutable publication, class snapshots, dynamic OPDs, both MRI scoring modes and legacy classes');
}
