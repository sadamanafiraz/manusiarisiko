import source from './bank.json';
import { CASE_SHEETS, MATRIX, ASPECTS } from './case-spec.mjs';
export const BUILTIN_ID='builtin-water';
export const BUILTIN_VERSION='riskman-v2-20261110';
export const MAX_CASE_BYTES=1200000;
export type CaseIssue={sheet:string;row:number;column:string;message:string};
export type CaseBank=Record<string,any>;
export function builtinCase():CaseBank {
 const bank:any=structuredClone(source);
 bank._meta={code:'air-bersih',title:'Misi Air Bersih Sumber Tirta',description:'Perluasan layanan air bersih melalui Bappeda, BPKAD, PU dan PDAM.',period:'2023–2025',version:BUILTIN_VERSION,builtin:true};
 const context:any={Kelompok:'Satu kabupaten/kota adalah satu kelompok berisi empat anggota. Setiap anggota menangani Bappeda, BPKAD, Dinas PU atau PDAM.', 'Peran anggota':'Anggota bekerja pada instansi masing-masing, menyelaraskan keputusan lintas instansi, dan menghasilkan satu MRI kabupaten/kota.', 'Risk Specialist':'120 menit bersama untuk identifikasi, analisis, pengendalian, evaluasi dan mitigasi. Waktu dimulai saat anggota pertama masuk.', 'Risk Assurer':'120 menit bersama untuk memeriksa dokumen, menilai enam aspek tiap risiko, dan memberikan rekomendasi. Kelas berlangsung terpisah dari Risk Specialist.'};
 for(const r of bank.Konteks_Program)if(context[r[0]])r[1]=context[r[0]];
 const a=bank.Bobot_Level.find((r:any[])=>r[0]==='Analisis');if(a)a[3]='Rata-rata 10 risiko: K benar 50%; D benar 50%. Berita menjadi bahan analisis, bukan butir jawaban.';
 return bank;
}
export function normalizeBank(input:any):CaseBank {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Data kasus tidak valid.');
 const bank:any={_meta:{code:String(input._meta?.code||'kasus-baru').trim().slice(0,40),title:String(input._meta?.title||'Kasus baru').trim().slice(0,100),description:String(input._meta?.description||'').trim().slice(0,1500),period:String(input._meta?.period||'2023–2025').trim().slice(0,100)}};
 for(const s of [...CASE_SHEETS,{key:'Konteks_Program',columns:[{}, {}, {}]}]){
  const rows=input[s.key]??[];if(!Array.isArray(rows)||rows.length>1000)throw Error('Terlalu banyak baris pada '+s.key+'.');
  bank[s.key]=rows.map((row:any)=>{if(!Array.isArray(row))throw Error('Format baris '+s.key+' tidak valid.');return s.columns.map((_:any,i:number)=>{const v=row[i]??null;if(v!==null&&!['string','number'].includes(typeof v))throw Error('Isi sel harus teks atau angka.');if(typeof v==='string'&&v.length>12000)throw Error('Teks sel terlalu panjang pada '+s.key+'.');if(typeof v==='number'&&!Number.isFinite(v))throw Error('Angka tidak valid.');return typeof v==='string'?v.trim():v;});});
 }
 const built=builtinCase();bank.Kriteria_Matriks=built.Kriteria_Matriks;bank.Bobot_Level=built.Bobot_Level;
 if(JSON.stringify(bank).length>MAX_CASE_BYTES)throw Error('Data kasus melebihi 1,2 MB.');return bank;
}
export function emptyCase(title='Kasus baru',names:string[]=[]):CaseBank {
 const b:any={_meta:{code:'kasus-baru',title,description:'',period:'2023–2025'},Konteks_Program:[['Tujuan program','',''],['Hasil layanan','',''],['Konteks masalah','',''],['Titik awal','','']]};
 for(const s of CASE_SHEETS)b[s.key]=[];
 for(let n=1;n<=4;n++){
  const o='OPD'+n;b.Profil_OPD.push([o,names[n-1]||'Instansi '+n,2,'Membangun',0,1,'','','','','',0,0,90]);
  for(let j=1;j<=6;j++)b.Proses_Bisnis.push([`${o}-P${j}`,o,j,'','','','','','']);
  for(let j=1;j<=40;j++)b.Bank_Pernyataan.push([`${o}-S${String(j).padStart(2,'0')}`,o,'',j<=10?'Risiko':'Pengecoh',j<=10?1:0,`${o}-R${String((j-1)%10+1).padStart(2,'0')}`,'']);
  for(let j=1;j<=10;j++){
   const id=`${o}-R${String(j).padStart(2,'0')}`;
   b.Kunci_Risiko.push([id,o,'',1,1,1,`E-${id}`,'A','N',1,1,1,0,j,'Tidak perlu tambahan','']);
   b.Berita_Bukti.push([`E-${id}`,id,'Media simulasi','','',100,0,100,0,'Kinerja',99,99,'2023–2025','Simulasi pembelajaran']);
   b.Kontrol_Berjalan.push([`C-${id}`,id,'','','','','','N']);b.Kasus_Assurer.push([id,o,'','','','','','']);
   for(let k=1;k<=3;k++)b.Bank_Mitigasi.push([`${id}-M${k}`,id,o,'','',0,0,0,1,1,1,k===1?1:k===2?.5:0,'']);
   ASPECTS.forEach((a:string,i:number)=>b.Kunci_Assurer.push([`${id}-A${i+1}`,id,o,a,'',2,'',i===0?`CTX-${o}`:`E-${id}`,'R','','']));
  }
 }
 return normalizeBank(b);
}
export function validateCase(b:CaseBank):CaseIssue[]{
 const errors:CaseIssue[]=[];const add=(sheet:string,row:number,column:string,message:string)=>{if(errors.length<250)errors.push({sheet,row,column,message})};
 const text=(v:any)=>typeof v==='string'&&v.trim().length>0;
 const num=(v:any,lo=0,hi=Number.MAX_SAFE_INTEGER)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
 const int=(v:any,lo:number,hi:number)=>num(v,lo,hi)&&Number.isInteger(v);
 const safe=(v:any)=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(v);
 if(!/^[a-z0-9][a-z0-9-]{0,39}$/.test(b._meta?.code||''))add('Profil_Kasus',2,'Isi','Kode kasus memakai huruf kecil, angka dan tanda hubung.');
 if(!text(b._meta?.title)||b._meta.title.length<3)add('Profil_Kasus',3,'Isi','Judul minimal 3 karakter.');
 for(const label of ['Tujuan program','Hasil layanan','Konteks masalah'])if(!b.Konteks_Program.some((r:any[])=>r[0]===label&&text(r[1])))add('Profil_Kasus',0,label,'Isi konteks '+label.toLowerCase()+'.');
 const contextLabels=new Set();for(const [i,r]of b.Konteks_Program.entries()){if(!text(r[0])||contextLabels.has(r[0]))add('Profil_Kasus',i+6,'Parameter','Nama parameter konteks wajib diisi dan unik.');contextLabels.add(r[0]);}
 const opd=new Set(b.Profil_OPD.map((r:any[])=>r[0]));
 if(b.Profil_OPD.length!==4||opd.size!==4)add('Profil_Instansi',0,'Kode_OPD','Harus ada tepat 4 instansi dengan kode berbeda.');
 for(const s of CASE_SHEETS){const ids=new Set();for(const [i,r]of b[s.key].entries()){
  if(!safe(r[0])||ids.has(r[0]))add(s.name,i+2,s.columns[0].name,'ID harus unik, memakai huruf, angka, - atau _.');ids.add(r[0]);
  const oi=s.key==='Bank_Mitigasi'||s.key==='Kunci_Assurer'?2:s.key==='Berita_Bukti'||s.key==='Kontrol_Berjalan'?-1:1;
  if(s.key!=='Profil_OPD'&&oi>=0&&!opd.has(r[oi]))add(s.name,i+2,'Kode_OPD','Kode instansi tidak ditemukan.');
  for(let c=0;c<s.columns.length;c++)if(s.columns[c].type==='text'&&!text(r[c]))add(s.name,i+2,s.columns[c].name,'Wajib diisi.');
 }}
 for(const [i,p] of b.Profil_OPD.entries()){
  if(!/^[A-Z][A-Z0-9_-]{1,23}$/.test(p[0]))add('Profil_Instansi',i+2,'Kode_OPD','Kode instansi 2–24 karakter: huruf besar, angka, - atau _.');
  for(const c of [2,4,5,11,12,13])if(!num(p[c])||(c===2&&p[c]>5))add('Profil_Instansi',i+2,CASE_SHEETS[0].columns[c].name,'Angka harus valid dan tidak negatif; MRI maksimal 5.');
  if(p[11]>p[4])add('Profil_Instansi',i+2,'Plafon_mitigasi_juta','Cadangan mitigasi tidak boleh melebihi anggaran nonpegawai.');
  if(!int(p[5],1,100000)||!int(p[13],1,3650))add('Profil_Instansi',i+2,'Personel_durasi','Jumlah personel dan durasi harus bilangan bulat positif.');
 }
 const risks=new Map<string,any[]>(b.Kunci_Risiko.map((r:any[])=>[r[0],r]));
 for(const [i,r]of b.Proses_Bisnis.entries())if(!int(r[2],1,100)||b.Proses_Bisnis.some((s:any[],j:number)=>j!==i&&s[1]===r[1]&&s[2]===r[2]))add('Proses_Bisnis',i+2,'Urutan','Urutan harus bilangan bulat positif dan unik per instansi.');
 for(const [key,sheet,idColumn]of [['Kontrol_Berjalan','Pengendalian',1],['Kasus_Assurer','Register_Assurer',0]] as const)for(const [i,r]of b[key].entries())if(!risks.has(r[idColumn]))add(sheet,i+2,'ID_risiko','Risiko tidak ditemukan.');
 const byRisk=(key:string,id:string)=>b[key].filter((r:any[])=>r[1]===id);
 const matrix=(k:any,d:any)=>int(k,1,5)&&int(d,1,5)?MATRIX[k-1][d-1]:null;
 for(const o of opd){
  const rr=b.Kunci_Risiko.filter((r:any[])=>r[1]===o),ss=b.Bank_Pernyataan.filter((r:any[])=>r[1]===o),mm=b.Bank_Mitigasi.filter((r:any[])=>r[2]===o);
  if(rr.length!==10)add('Kunci_Penilaian',0,'Kode_OPD',o+': harus 10 risiko.');
  if(ss.length!==40||ss.filter((r:any[])=>r[4]===1).length!==10)add('Pernyataan',0,'Risiko_benar',o+': harus 40 pernyataan, tepat 10 benar.');
  if(mm.length!==30)add('Mitigasi',0,'Kode_OPD',o+': harus 30 opsi mitigasi.');
  const ordered=[...rr].sort((a:any,b:any)=>b[11]-a[11]||b[10]-a[10]||b[9]-a[9]||String(a[0]).localeCompare(String(b[0])));
  ordered.forEach((r:any,i:number)=>{if(r[13]!==i+1)add('Kunci_Penilaian',b.Kunci_Risiko.indexOf(r)+2,'Urutan_prioritas','Urutan harus unik dan mengikuti skor residu, D, K menurun, lalu ID menaik.');});
  if(!b.Proses_Bisnis.some((r:any[])=>r[1]===o))add('Proses_Bisnis',0,'Kode_OPD',o+': proses bisnis belum diisi.');
  const p=b.Profil_OPD.find((r:any[])=>r[0]===o),best=rr.filter((r:any[])=>r[12]===1).map((r:any[])=>mm.find((m:any[])=>m[0]===r[14])).filter(Boolean);
  if(p&&(best.reduce((s:number,m:any[])=>s+m[5],0)>p[11]||best.reduce((s:number,m:any[])=>s+m[6],0)>p[12]||Math.max(0,...best.map((m:any[])=>m[7]))>p[13]))add('Mitigasi',0,'ID_mitigasi_acuan',o+': portofolio mitigasi acuan melampaui sumber daya.');
 }
 for(const [i,s]of b.Bank_Pernyataan.entries())if(![0,1].includes(s[4])||!risks.has(s[5])||risks.get(s[5])?.[1]!==s[1])add('Pernyataan',i+2,'ID_risiko','Pernyataan harus terhubung ke risiko instansi yang sama dan bendera benar bernilai 0/1.');
 for(const [i,r]of b.Kunci_Risiko.entries()){
  const row=i+2;
  for(const [k,d,s]of [[3,4,5],[9,10,11]])if(matrix(r[k],r[d])===null||matrix(r[k],r[d])!==r[s])add('Kunci_Penilaian',row,'Skor','K/D harus 1–5 dan skor sesuai matriks permainan.');
  if(![0,1].includes(r[12])||r[12]!==Number(r[11]>11))add('Kunci_Penilaian',row,'Tangani','Tangani = 1 jika skor residu di atas 11.');
  if(!['A','B'].includes(r[7]))add('Kunci_Penilaian',row,'Kunci_kontrol','Pilih A atau B.');
  const effect=(r[9]<r[3]?'K':'')+(r[10]<r[4]?'D':'')||'N';if(r[9]>r[3]||r[10]>r[4]||r[8]!==effect)add('Kunci_Penilaian',row,'Kunci_efek','Efek harus konsisten dengan penurunan K/D residu.');
  if(b.Bank_Pernyataan.filter((s:any[])=>s[5]===r[0]&&s[4]===1).length!==1)add('Pernyataan',0,'ID_risiko',r[0]+': perlu tepat satu pernyataan risiko benar.');
  for(const [key,sheet]of [['Berita_Bukti','Bukti_Berita'],['Kontrol_Berjalan','Pengendalian']])if(byRisk(key,r[0]).length!==1)add(sheet,0,'ID_risiko',r[0]+': perlu tepat satu baris.');
  const news=byRisk('Berita_Bukti',r[0])[0],control=byRisk('Kontrol_Berjalan',r[0])[0];
  if(news&&(news[0]!==`E-${r[0]}`||r[6]!==news[0]))add('Kunci_Penilaian',row,'ID_bukti','ID bukti harus E- diikuti ID risiko yang sama.');
  if(control&&(control[0]!==`C-${r[0]}`||control[7]!==r[8]))add('Pengendalian',b.Kontrol_Berjalan.indexOf(control)+2,'Kunci_efek','ID harus C-IDrisiko dan efek sama dengan kunci risiko.');
  if(b.Kasus_Assurer.filter((a:any[])=>a[0]===r[0]&&a[1]===r[1]).length!==1)add('Register_Assurer',0,'ID_risiko',r[0]+': register auditor belum lengkap.');
  const reviews=byRisk('Kunci_Assurer',r[0]);if(reviews.length!==6||new Set(reviews.map((a:any[])=>a[3])).size!==6||reviews.some((a:any[])=>!ASPECTS.includes(a[3])))add('Kunci_Assurer',0,'Aspek',r[0]+': perlu 6 aspek reviu berbeda sesuai template.');
  const options=byRisk('Bank_Mitigasi',r[0]);if(options.length!==3)add('Mitigasi',0,'ID_risiko',r[0]+': perlu 3 opsi.');
  if(r[12]===1){const m=options.find((m:any[])=>m[0]===r[14]);if(!m||m[11]!==1||m[10]>11)add('Kunci_Penilaian',row,'ID_mitigasi_acuan','Risiko prioritas memerlukan mitigasi acuan berkredit 1 dan target skor maksimal 11.');}
 }
 for(const [i,n]of b.Berita_Bukti.entries()){
  if(!risks.has(n[1]))add('Bukti_Berita',i+2,'ID_risiko','Risiko tidak ditemukan.');
  if(!['Kinerja','Keuangan'].includes(n[9]))add('Bukti_Berita',i+2,'Jenis_dampak','Gunakan Kinerja atau Keuangan.');
  for(const [a,c]of [[5,6],[7,8]])if(!num(n[a],.0001)||!num(n[c],0,n[a]))add('Bukti_Berita',i+2,'Paparan','Paparan harus positif dan kejadian tidak melebihi paparan.');
  for(const c of [10,11])if(!num(n[c],0,100))add('Bukti_Berita',i+2,'Dampak','Dampak harus berupa angka persentase 0–100.');
  const risk=risks.get(n[1]),k=(v:number)=>v<=5?1:v<=10?2:v<=20?3:v<=50?4:5;
  const d=(v:number)=>n[9]==='Kinerja'?(v>97?1:v>92?2:v>87?3:v>80?4:5):(v<=.01?1:v<=.1?2:v<=1?3:v<=5?4:5);
  if(risk&&num(n[5],.0001)&&num(n[6],0,n[5])&&num(n[7],.0001)&&num(n[8],0,n[7])&&(risk[3]!==k(n[6]/n[5]*100)||risk[9]!==k(n[8]/n[7]*100)))add('Bukti_Berita',i+2,'Kejadian','Frekuensi sebelum/sesudah harus mendukung K awal/residu pada kunci.');
  if(risk&&num(n[10],0,100)&&num(n[11],0,100)&&(risk[4]!==d(n[10])||risk[10]!==d(n[11])))add('Bukti_Berita',i+2,'Dampak','Dampak sebelum/sesudah harus mendukung D awal/residu pada kunci.');
 }
 for(const [i,m]of b.Bank_Mitigasi.entries()){
  if(!risks.has(m[1])||risks.get(m[1])?.[1]!==m[2])add('Mitigasi',i+2,'ID_risiko','Risiko tidak ditemukan pada instansi yang sama.');
  if(![5,6,7].every(c=>num(m[c]))||!int(m[7],0,3650)||!num(m[11],0,1))add('Mitigasi',i+2,'Sumber_daya','Biaya, orang-hari dan durasi harus valid; kredit antara 0–1.');
  if(matrix(m[8],m[9])===null||matrix(m[8],m[9])!==m[10])add('Mitigasi',i+2,'Skor_target','K/D target harus 1–5 dan skor sesuai matriks.');
 }
 for(const [i,r]of b.Kunci_Assurer.entries()){
  const risk=risks.get(r[1]);if(!risk||risk[1]!==r[2])add('Kunci_Assurer',i+2,'ID_risiko','Risiko tidak ditemukan pada instansi yang sama.');
  if(![0,1,2].includes(r[5])||!['P','R','X'].includes(r[8]))add('Kunci_Assurer',i+2,'Kunci','Diagnosis harus 0/1/2 dan rekomendasi P/R/X.');
  if(![`CTX-${r[2]}`,`E-${r[1]}`,`C-${r[1]}`,`M-${r[1]}`,'Tanpa bukti'].includes(r[7]))add('Kunci_Assurer',i+2,'Kunci_bukti','Rujukan bukti tidak valid untuk risiko ini.');
  const reg=b.Kasus_Assurer.find((a:any[])=>a[0]===r[1]);const aspect=ASPECTS.indexOf(r[3]);if(reg&&aspect>=0&&r[4]!==reg[aspect+2])add('Kunci_Assurer',i+2,'Pernyataan_OPD','Pernyataan harus sama dengan kolom aspek terkait dalam Register_Assurer.');
 }
 return errors;
}
