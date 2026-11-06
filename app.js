const REFRESH_EVERY_MS=15000;
const messages=['¡Vamos por la Teletón! ❤️','¡Cada aporte cuenta!','¡Felicitaciones por lo recaudado!','¡Unidos hacemos la diferencia!','¡Sigamos sumando corazones!','¡Gracias por su generosidad!'];
const $=id=>document.getElementById(id);
const money=n=>n===null||n===undefined?'—':'$'+Math.round(n).toLocaleString('es-CL');
let data={cursos:[],funcionarios:null,totalColegio:null},slides=[],index=0,lastSignature='',updateTimer=null;

function buildSlides(){
  const courseSlides=data.cursos.map(c=>({id:'curso:'+c.nombre,nombre:c.nombre,monto:c.monto,category:'RECAUDACIÓN POR CURSO'}));
  slides=[...courseSlides,{id:'funcionarios',nombre:'Funcionarios',monto:data.funcionarios,category:'APORTE DE FUNCIONARIOS'},{id:'colegio',nombre:'¡Nuestro colegio!',monto:data.totalColegio,category:'TOTAL RECAUDADO'}];
}
function burst(count=44){
  const container=$('confetti');container.replaceChildren();
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(let i=0;i<count;i++){
    const piece=document.createElement('i');piece.className='confetti';
    piece.style.setProperty('--left',Math.random()*100+'%');
    piece.style.setProperty('--color',['#ffe777','#ffffff','#ff9db5','#a1f5d0','#ffbd68'][i%5]);
    piece.style.setProperty('--duration',2.5+Math.random()*2.4+'s');
    piece.style.setProperty('--drift',(Math.random()-.5)*280+'px');
    piece.style.setProperty('--rotation',Math.random()*360+'deg');
    container.appendChild(piece);
  }
  setTimeout(()=>container.replaceChildren(),5100);
}
function animateAmount(target,amount){
  if(amount==null){target.textContent='SIN DATO';return;}
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){target.textContent=Math.round(amount).toLocaleString('es-CL');return;}
  const start=performance.now(),duration=850;
  const tick=t=>{const p=Math.min(1,(t-start)/duration),e=1-Math.pow(1-p,4);target.textContent=Math.round(amount*e).toLocaleString('es-CL');if(p<1)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
}
function render(animate=true){
  if(!slides.length)return;
  const slide=slides[index];
  const digits=slide.monto==null?7:Math.round(slide.monto).toLocaleString('es-CL').length;
  $('amount').style.fontSize=digits>=12?'clamp(38px,5.2vw,105px)':digits>=10?'clamp(45px,6.6vw,130px)':'';
  $('category').textContent=slide.category;$('name').textContent=slide.nombre;
  $('message').textContent=messages[index%messages.length];
  $('counter').textContent=(index+1)+' / '+slides.length;
  const amountEl=$('amount');
  if(animate){const s=document.querySelector('.spotlight');s.classList.remove('animate');void s.offsetWidth;s.classList.add('animate');animateAmount(amountEl,slide.monto);burst(slide.id==='colegio'?70:22);}
  else amountEl.textContent=slide.monto==null?'SIN DATO':Math.round(slide.monto).toLocaleString('es-CL');
}
function move(by){if(!slides.length)return;index=(index+by+slides.length)%slides.length;render(true)}
function setConnection(text,type){$('status').textContent=text;$('dot').className='dot '+type;}
async function refresh(manual=false){
  try {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),13500);
    let response;
    try{response=await fetch('/.netlify/functions/datos?_='+Date.now(),{cache:'no-store',signal:controller.signal});}
    finally{clearTimeout(timeout);}
    if(!response.ok)throw new Error('Error HTTP '+response.status);
    const received=await response.json();if(received.error)throw new Error(received.detalle||received.error);
    const previousSlide=slides[index]?.id;
    const signature=JSON.stringify([received.cursos,received.funcionarios,received.totalColegio]);
    const changed=signature!==lastSignature;
    data=received;buildSlides();lastSignature=signature;
    if(previousSlide){const preserved=slides.findIndex(s=>s.id===previousSlide);index=preserved>=0?preserved:Math.min(index,slides.length-1);}
    $('staff').textContent=money(data.funcionarios);$('school').textContent=money(data.totalColegio);
    const count=data.cursos.length;
    if(!count || data.totalColegio===null || data.funcionarios===null){setConnection('Revisar lectura de planilla','error');}
    else setConnection('Datos actualizados · '+new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),'live');
    if(changed||manual){render(Boolean(changed||manual));}
  }catch(e){setConnection('Sin conexión · reintentando','error');console.error('Actualización:',e);if(!slides.length){$('name').textContent='Conectando con los aportes';$('message').textContent='Verifica la publicación de la planilla';}}
}
document.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'||event.key==='ArrowDown'||event.key===' '){event.preventDefault();move(1);}
  else if(event.key==='ArrowLeft'||event.key==='ArrowUp'){event.preventDefault();move(-1);}
  else if(event.key.toLowerCase()==='f'){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();}
  else if(event.key.toLowerCase()==='r'){event.preventDefault();refresh(true);}
  else if(event.key==='Home'){index=0;render(true);}
  else if(event.key==='End'){index=slides.length-1;render(true);}
});
refresh();updateTimer=setInterval(()=>refresh(),REFRESH_EVERY_MS);
