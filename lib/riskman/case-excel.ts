import ExcelJS from 'exceljs';
import { CASE_SHEETS, CONTEXT_COLUMNS, profileRows, applyProfileRows } from './case-spec.mjs';
import { builtinCase, emptyCase, normalizeBank, type CaseBank } from './case-bank';

export async function writeCaseWorkbook(bank:CaseBank):Promise<Buffer>{
 const wb=new ExcelJS.Workbook();wb.creator='Riskman';wb.title=bank._meta?.title||'Template kasus Riskman';
 const help=wb.addWorksheet('Panduan');
 help.addRows([
  ['PETUNJUK PAKET KASUS RISKMAN','Format 1.0'],
  ['Mulai','Salin contoh air bersih atau isi template ini. Setiap paket dipakai oleh 4 instansi dalam satu kelompok.'],
  ['Struktur','Pertahankan nama sheet dan header baris 1. Isi data mulai baris 2. Sel kosong belum dianggap selesai.'],
  ['Jumlah','Per instansi: 40 pernyataan (10 benar), 10 risiko, 30 mitigasi dan 60 butir reviu auditor.'],
  ['Satuan','Biaya dan anggaran dalam Rp juta; personel dalam orang-hari; durasi dalam hari kalender paralel.'],
  ['Dampak','Kinerja = persentase capaian (85 berarti 85%). Keuangan = persen kerugian terhadap anggaran (0.5 berarti 0,5%).'],
  ['Kunci','Kunci_Penilaian dan Kunci_Assurer hanya untuk pengajar. Kunci tahap lain dibuka setelah peserta mengumpulkan.'],
  ['Skor','Specialist: identifikasi 20%, analisis 20%, kontrol/residu 20%, evaluasi 15%, mitigasi 25%. Analisis K/D masing-masing 50%.'],
  ['Skor auditor','Assurer: diagnosis 50%, bukti 20%, rekomendasi 30%. MRI = nilai tertimbang / 20, dibulatkan 2 desimal.'],
  ['Publikasi','Unggah sebagai draf, perbaiki kesalahan validasi, lalu terbitkan. Versi terbit tidak dapat ditimpa; unggah revisi sebagai draf baru.'],
  ['Sesi','Waktu 120 menit. Satu kelompok memiliki 4 anggota. Kelas menyimpan salinan kasus dan kunci untuk menjaga konsistensi hasil.'],
  ['Matriks','K/D 1–5 mengikuti acuan permainan. Skor residu > 11 ditangani; lainnya dimonitor. Jangan memakai K × D.'],
  ['Prioritas','Skor residu menurun; jika sama, D menurun, K menurun, lalu ID risiko menaik. Urutan 1–10 wajib unik.'],
  ['Rujukan','E-IDrisiko untuk berita; C-IDrisiko untuk kontrol; CTX-KodeOPD untuk profil; M-IDrisiko untuk usulan mitigasi.'],
  ['Kontrol','Kunci A atau B menunjukkan opsi yang telah berjalan. Efek N = tidak turun, K = kemungkinan turun, D = dampak turun, KD = keduanya turun.'],
  ['Kualitas mitigasi','0 sampai 1. Mitigasi acuan prioritas harus berkredit 1, mencapai skor ≤11, dan portofolionya layak dalam sumber daya instansi.'],
  ['Aspek auditor','Identifikasi; Analisis; Pengendalian berjalan; Evaluasi; Rencana mitigasi; Implementasi / monitoring.'],
  ['Formula','Gunakan nilai biasa. Formula, makro, dan sel error tidak diterima.'],
  ['Pemakaian','MRI adalah nilai permainan, bukan hasil asesmen maturitas organisasi. Validasi isi berita dan alasan penilaian dilakukan pengajar.']
 ]);
 const add=(name:string,columns:any[],rows:any[][])=>{
  const ws=wb.addWorksheet(name);ws.addRow(columns.map(c=>c.name));for(const r of rows)ws.addRow(columns.map((_,i)=>r[i]??null));
  ws.views=[{state:'frozen',ySplit:1,xSplit:1}];ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:columns.length}};
  ws.getRow(1).height=42;ws.getRow(1).font={bold:true,color:{argb:'FFF7EFDB'},size:11};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF253F35'}};
  columns.forEach((c,i)=>{const column=ws.getColumn(i+1);column.width=c.type==='id'?24:c.type==='number'||c.type==='integer'?19:52;column.alignment={vertical:'top',wrapText:true};if(c.type==='number')column.numFmt='0.##';if(c.type==='integer')column.numFmt='0';});
  for(let i=2;i<=ws.rowCount;i++){const row=ws.getRow(i);row.height=84;row.font={name:'Calibri',size:11,color:{argb:'FF24536F'}};if(i%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8F5EA'}};}
  return ws;
 };
 add('Profil_Kasus',CONTEXT_COLUMNS,profileRows(bank));
 for(const s of CASE_SHEETS)add(s.name,s.columns,bank[s.key]||[]);
 const acuan=add('Acuan',[{name:'Kriteria'},{name:'Level'},{name:'Uraian'}],(bank.Kriteria_Matriks||[]).map((r:any[])=>r.slice(0,3)));
 acuan.getColumn(1).width=25;acuan.getColumn(2).width=12;acuan.getColumn(3).width=95;
 help.getColumn(1).width=25;help.getColumn(2).width=110;help.eachRow((r,i)=>{r.height=i===1?32:44;r.alignment={wrapText:true,vertical:'top'};r.font={name:'Calibri',size:11,...(i===1?{bold:true,color:{argb:'FFFFFFFF'}}:{color:{argb:'FF253F35'}})};if(i===1)r.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF253F35'}};});
 help.views=[{state:'frozen',ySplit:1}];
 return Buffer.from(await wb.xlsx.writeBuffer());
}

function checkArchive(data:Buffer){
 if(data.length>2000000)throw Error('Berkas Excel maksimal 2 MB.');
 let end=-1;for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)if(data.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw Error('Berkas bukan Excel .xlsx yang valid.');
 const count=data.readUInt16LE(end+10),offset=data.readUInt32LE(end+16),size=data.readUInt32LE(end+12);if(count>150||offset+size>end)throw Error('Struktur Excel tidak didukung.');
 let p=offset,total=0;for(let n=0;n<count;n++){
  if(p+46>data.length||data.readUInt32LE(p)!==0x02014b50)throw Error('Arsip Excel rusak.');
  const expanded=data.readUInt32LE(p+24),nameSize=data.readUInt16LE(p+28),extra=data.readUInt16LE(p+30),comment=data.readUInt16LE(p+32);total+=expanded;
  const name=data.subarray(p+46,p+46+nameSize).toString();if(/vbaProject|\.bin$/i.test(name)||expanded>12000000||total>25000000)throw Error('Makro atau ukuran isi Excel tidak didukung.');p+=46+nameSize+extra+comment;
 }
}
export async function readCaseWorkbook(data:Buffer):Promise<CaseBank>{
 checkArchive(data);const wb=new ExcelJS.Workbook();try{await wb.xlsx.load(data as any);}catch{throw Error('Excel tidak dapat dibaca. Gunakan template .xlsx Riskman.');}
 const read=(name:string,columns:any[])=>{
  const ws=wb.getWorksheet(name);if(!ws)throw Error('Sheet '+name+' tidak ditemukan.');if(ws.rowCount>1001||ws.columnCount>40)throw Error('Terlalu banyak baris atau kolom di '+name+'.');
  const cell=(row:number,col:number)=>{const c=ws.getCell(row,col),v=c.value;if(c.type===ExcelJS.ValueType.Formula||c.type===ExcelJS.ValueType.Error)throw Error(`${name}, baris ${row}, kolom ${col}: formula dan sel error tidak diterima.`);if(v===null||v===undefined)return null;if(typeof v==='number'||typeof v==='string')return typeof v==='string'?v.trim():v;if(typeof v==='object'&&'richText'in v)return c.text.trim();if(typeof v==='object'&&'hyperlink'in v)return c.text.trim();throw Error(`${name}, baris ${row}: gunakan teks atau angka biasa.`);};
  columns.forEach((c,i)=>{if(cell(1,i+1)!==c.name)throw Error(`${name}, baris 1, kolom ${i+1}: header harus ${c.name}.`);});
  const rows:any[][]=[];for(let n=2;n<=ws.rowCount;n++){const row=columns.map((_,i)=>cell(n,i+1));if(row.every(c=>c===null||c===''))continue;rows.push(row);}
  return rows;
 };
 const bank:any=emptyCase();applyProfileRows(bank,read('Profil_Kasus',CONTEXT_COLUMNS));for(const s of CASE_SHEETS)bank[s.key]=read(s.name,s.columns);
 return normalizeBank(bank);
}
