// Consulta los valores publicados de Google Sheets directamente en cada actualización.
// Ningún token ni credencial es necesario para una planilla pública.
const SHEET = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmDE1iUNPeU1WVOd57G7n73f5ZKZ0N8uMLGTo_PM23ZSrxU37cTaXhrG0op27n4Q/pub?output=csv';

function parseCsv(text) {
  const rows=[]; let row=[], field='', inQuotes=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(inQuotes && text[i+1]==='"') { field+='"'; i++; } else inQuotes=!inQuotes; }
    else if(c===',' && !inQuotes) {row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!inQuotes) {
      if(c==='\r' && text[i+1]==='\n') i++;
      row.push(field);rows.push(row);row=[];field='';
    } else field+=c;
  }
  if(field!==''||row.length){row.push(field);rows.push(row);}
  return rows;
}
function money(text) {
  if(typeof text==='number') return text;
  let s=String(text??'').trim();
  if(!s || /^(?:-|—|N\/A|#|sin dato)/i.test(s)) return null;
  // Ignorar texto descriptivo; admitir solamente símbolos monetarios y cifras.
  if(!/^[\s$CLP\d.,+-]+$/i.test(s)) return null;
  s=s.replace(/\$|CLP|\s/gi,'');
  if(!/\d/.test(s)) return null;
  if(s.includes(',')&&s.includes('.')) s=s.replace(/\./g,'').replace(',','.');
  else if(s.includes(',')) s=/,\d{1,2}$/.test(s)?s.replace(',','.'):s.replace(/,/g,'');
  else if(s.includes('.')) s=/\.\d{1,2}$/.test(s)?s:s.replace(/\./g,'');
  const n=Number(s); return Number.isFinite(n)&&n>=0?n:null;
}
function courseName(value){
  const s=String(value??'').replace(/\s+/g,' ').trim();
  // 7° básico, 1° medio, 4° A TP, etc.
  if(!s || s.length>80 || /total|recaud|funcionar|colegio|profesor|aporte|meta|telet[oó]n/i.test(s)) return false;
  return /(?:^|\s)(?:[1-4]|7|8)\s*[°ºªo]?\s*(?:(?:b[aá]sico|medio)\s*)?(?:[-–]?\s*[A-H]\b|(?:b[aá]sico|medio)\b)/i.test(s) || /\b(?:[1-4]|7|8)\s*[°º]\s*[A-H]/i.test(s);
}
function readAmountNear(rows, r, c) {
  // En la planilla del colegio los totales generales están en L.
  // Si el curso aparece en otra columna de la misma fila, priorizar su valor en L.
  const totalEnL=money(rows[r]?.[11]);
  if(c!==11 && totalEnL!==null) return totalEnL;
  const picks=[];
  function consider(rr,cc,weight) {
    const val=money(rows[rr]?.[cc]); if(val===null) return;
    let heading='';
    for(let k=1;k<=3;k++) heading+=' '+String(rows[Math.max(0,rr-k)]?.[cc]??'');
    const boost=/total|monto|recaudado|acumulado/i.test(heading)?8:0;
    picks.push({val,score:weight+boost});
  }
  for(let d=1;d<=5;d++) consider(r,c+d,30-d*3);
  for(let d=1;d<=3;d++) consider(r+d,c,24-d*3);
  for(let d=1;d<=2;d++) for(let h=1;h<=3;h++)consider(r+d,c+h,13-d-h);
  picks.sort((a,b)=>b.score-a.score);
  return picks.length?picks[0].val:null;
}
function parseData(rows){
  // Totales establecidos en la planilla: L9 (funcionarios) y L12 (colegio).
  const funcionarios=money(rows[8]?.[11]);
  const colegio=money(rows[11]?.[11]);
  const courses=[];const seen=new Set();
  for(let r=0;r<rows.length;r++) {
    if(r===8 || r===11) continue; // L9 y L12 son totales, no cursos.
    for(let c=0;c<(rows[r]?.length||0);c++) {
    let name=String(rows[r][c]??'').trim();
    if(!courseName(name)) continue;
    name=name.replace(/\s+/g,' ');
    const key=name.toUpperCase().replace(/\s/g,'');
    if(seen.has(key)) continue;
    const monto=readAmountNear(rows,r,c);
    if(monto!==null) {courses.push({nombre:name,monto});seen.add(key);}
  }
  }
  return {cursos:courses,funcionarios,totalColegio:colegio,actualizado:new Date().toISOString(),celdas:{funcionarios:'L9',colegio:'L12'}};
}
exports.handler=async function(){
  try {
    const res=await fetch(SHEET+'&_t='+Date.now(),{headers:{'Accept':'text/csv'},signal:AbortSignal.timeout(12000)});
    if(!res.ok)throw new Error('Google Sheets respondió '+res.status);
    const csv=await res.text();
    if(csv.trim().startsWith('<!DOCTYPE')||csv.trim().startsWith('<html'))throw new Error('La publicación no devolvió CSV');
    const data=parseData(parseCsv(csv));
    return {statusCode:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate','Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)};
  } catch(e){
    return {statusCode:502,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify({error:'No se pudo consultar la planilla publicada.',detalle:e.message})};
  }
};
// Exportación de funciones para pruebas con Node.
exports._test={parseCsv,money,courseName,parseData};
