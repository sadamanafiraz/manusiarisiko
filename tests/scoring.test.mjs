import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {emptyState,cleanState,assess,completeness,playerBank} from '../lib/riskman/scoring.mjs';
const bank=JSON.parse(readFileSync(new URL('../lib/riskman/bank.json',import.meta.url)));
export function perfect(mode,opd){let s=emptyState();s.locked=true;s.mitConfirmed=true;s.selected=bank.Bank_Pernyataan.filter(r=>r[1]===opd&&r[4]===1).map(r=>r[0]);for(const r of bank.Kunci_Risiko.filter(r=>r[1]===opd)){s.answers[r[0]]={k:r[3],d:r[4],control:r[7],effect:r[8],kr:r[9],dr:r[10],handle:r[12],rank:r[13]};if(r[12])s.mitigation[r[0]]=r[14]}for(const r of bank.Kunci_Assurer.filter(r=>r[2]===opd))s.reviews[r[0]]={diagnosis:r[5],evidence:r[7],rec:r[8]};return s}
for(const opd of ['BAPPEDA','BPKAD','PU','PDAM'])for(const mode of ['specialist','assurer']){const s=cleanState(bank,mode,opd,perfect(mode,opd)),a=assess(bank,mode,opd,s);assert.equal(completeness(bank,mode,opd,s).issues.length,0);assert.equal(a.mri,5);assert.equal(a.errors.length,0);assert.ok(completeness(bank,mode,opd,emptyState()).issues.length);console.log('PASS',mode,opd,'MRI 5; no errors')}
let wrong=perfect('specialist','BAPPEDA');wrong.answers['BAPPEDA-R01'].k=1;let result=assess(bank,'specialist','BAPPEDA',wrong);assert.equal(result.mri,4.95);assert.equal(result.errors.length,1);assert.equal(result.errors[0].actual,1);assert.equal(result.errors[0].expected,4);
let pub=playerBank(bank,'BAPPEDA',false);assert.ok(pub.Bank_Pernyataan.every(r=>r[4]===null&&r[5]===null));assert.ok(pub.Kunci_Risiko.every(r=>r.slice(3).every(v=>v===null)));assert.ok(pub.Bank_Mitigasi.every(r=>r[11]===null));assert.ok(pub.Kunci_Assurer.every(r=>r[5]===null&&r[8]===null));
const clean=cleanState(bank,'specialist','BAPPEDA',{...wrong,score:100,mri:5,answers:{'BAPPEDA-R01':{k:999,d:'4',kr:-1}},selected:Array(20).fill('BAPPEDA-S01')});assert.equal(clean.answers['BAPPEDA-R01'].k,undefined);assert.equal(clean.selected.length,1);assert.equal(clean.mri,undefined);console.log('PASS wrong-answer detail, key redaction, forged-score rejection and input normalization');

// Specialist news is reading material: missing or legacy selected references must not affect marks.
for(const opd of ['BAPPEDA','BPKAD','PU','PDAM']){
 const state=perfect('specialist',opd),baseline=assess(bank,'specialist',opd,state);
 assert.equal(completeness(bank,'specialist',opd,state).progress,100);
 for(const a of Object.values(state.answers))a.evidence='E-WRONG-LEGACY';
 assert.deepEqual(assess(bank,'specialist',opd,state),baseline);
 const normalized=cleanState(bank,'specialist',opd,state);
 assert.ok(Object.values(normalized.answers).every(a=>!('evidence' in a)));
 assert.equal(completeness(bank,'specialist',opd,normalized).issues.length,0);
}
// The Assurer's separate audit-evidence task still needs evidence and remains graded.
const audit=perfect('assurer','BAPPEDA'),auditKey=Object.keys(audit.reviews)[0];
delete audit.reviews[auditKey].evidence;
assert.ok(completeness(bank,'assurer','BAPPEDA',audit).issues.length>0);
assert.ok(assess(bank,'assurer','BAPPEDA',audit).errors.some(e=>e.stage==='Bukti reviu'));
// Check the browser and server agree when K/D are filled without news selection.
const {createContext,runInContext}=await import('node:vm');
const source=readFileSync(new URL('../public/game/app.js',import.meta.url),'utf8').split("$('#modal').addEventListener")[0];
for(const opd of ['BAPPEDA','BPKAD','PU','PDAM']){
 const state=perfect('specialist',opd),context=createContext({BANK:bank,CLASSROOM:{group:{mode:'specialist',opd},state},window:{}});
 runInContext(source,context);
 const html=runInContext('analysis()',context);
 assert.ok(!html.includes('Rujukan berita yang mendukung jawaban'));
 assert.ok(!html.includes("'evidence'"));assert.ok(html.includes('Baca berita'));
 assert.equal(runInContext('progress()',context),100);assert.equal(runInContext('completeness().length',context),0);
 assert.equal(runInContext('calculate().mri',context),5);
}
console.log('PASS Specialist news reference removed from UI, completeness and scoring; K/D share 50/50; Assurer audit evidence preserved');
