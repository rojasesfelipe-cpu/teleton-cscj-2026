'use strict';
// Pantalla de escenario. Solo el operador controla la navegación.
// Google Sheets se consulta cada 15 segundos SIN cambiar de diapositiva.
const REFRESH_MS=15000;
const endpoint='/.netlify/functions/datos';
const $=id=>document.getElementById(id);
const fmt=value=>value==null?'—':'$'+Math.round(value).toLocaleString('es-CL');
const digits=value=>value==null?'—':Math.round(value).toLocaleString('es-CL');
const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const phrases=[
  '¡CADA APORTE CUENTA!',
  '¡GRACIAS POR SUMAR CORAZONES!',
  '¡JUNTOS HACEMOS LA DIFERENCIA!',
  '¡UN CURSO QUE INSPIRA!',
  '¡FELICITACIONES POR SU ENTREGA!',
  '¡SEGUIMOS UNIENDO CORAZONES!',
  '¡QUE SIGA CRECIENDO LA SOLIDARIDAD!'
];
let data={cursos:[],funcionarios:null,totalColegio:null};
let slides=[];let index=0;let loaded=false;let amountFrame=0;let drawFrame=0;let particles=[];
let fetchBusy=false;let eventCounter=0;
let galaMessageTimer=0, galaCelebrationTimer=0, galaFrame=0;
const galaMessages=[
 '¡Gracias por ser parte de esta gran cruzada!',
 '¡El Sagrado Corazón late por la Teletón!',
 '¡Juntos hacemos la diferencia!',
 '¡Unidos de corazón, lo logramos!'
];
function stopGala(){clearInterval(galaMessageTimer);clearInterval(galaCelebrationTimer);cancelAnimationFrame(galaFrame);}
function animateGala(value, animate=true){
 cancelAnimationFrame(galaFrame);
 const el=$('gala-money');
 const finalValue = (value ?? data.totalColegio);
 if(finalValue==null || Number.isNaN(finalValue)){el.textContent='$—';return;}
 if(!animate||prefersReduced.matches){el.textContent=fmt(finalValue);return;}
 el.textContent='$0';
 const start=performance.now(),duration=1550;
 function tick(now){const t=Math.min(1,(now-start)/duration);const eased=1-Math.pow(1-t,4.4);el.textContent=fmt(finalValue*eased);if(t<1)galaFrame=requestAnimationFrame(tick);else el.textContent=fmt(finalValue);}
 galaFrame=requestAnimationFrame(tick);
}
function startGala(){
 stopGala();
 $('gala-gratitude-text').textContent='Gracias a nuestros '+data.cursos.length+' cursos, funcionarios y familias por su compromiso y solidaridad.';
 $('gala-message').textContent=galaMessages[0];
 let messageIndex=0;
 galaMessageTimer=setInterval(()=>{if(slides[index]?.scene==='colegio'){$('gala-message').classList.remove('swap');void $('gala-message').offsetWidth;$('gala-message').classList.add('swap');messageIndex=(messageIndex+1)%galaMessages.length;$('gala-message').textContent=galaMessages[messageIndex];}},6500);
 galaCelebrationTimer=setInterval(()=>{if(slides[index]?.scene==='colegio')fireworks('funcionarios');},8500);
}


function makeSlides(){
  return [
    ...data.cursos.map((c,i)=>({id:'curso:'+i+':'+c.nombre,nombre:c.nombre,monto:c.monto,category:'RECAUDACIÓN POR CURSO',scene:'curso'})),
    {id:'funcionarios',nombre:'FUNCIONARIOS',monto:data.funcionarios,category:'¡NUESTRO EQUIPO TAMBIÉN SE SUMA!',scene:'funcionarios'},
    {id:'colegio',nombre:'¡GRAN TOTAL!',monto:data.totalColegio,category:'RECAUDACIÓN DE TODO EL COLEGIO',scene:'colegio'}
  ];
}
function setStatus(ok,message){$('live-dot').className='live-dot '+(ok?'ok':'bad');$('live-text').textContent=message;}
function animateNumber(el,value){
  cancelAnimationFrame(amountFrame);
  if(value===null||value===undefined){el.textContent='SIN DATO';return;}
  if(prefersReduced.matches){el.textContent=digits(value);return;}
  const started=performance.now(),duration=1200;
  function tick(now){
    const t=Math.min(1,(now-started)/duration);
    const eased=1-Math.pow(1-t,4.5);
    el.textContent=digits(Math.round(value*eased));
    if(t<1)amountFrame=requestAnimationFrame(tick);
  }
  amountFrame=requestAnimationFrame(tick);
}
const canvas=$('fx');const ctx=canvas.getContext('2d');
function resizeCanvas(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener('resize',resizeCanvas);resizeCanvas();
function fireworks(strength){
  if(prefersReduced.matches||!ctx)return;
  const colours=['#fff4c2','#ffe184','#ffffff','#ff9fbb','#ff5875','#b9fbe5'];
  const count=strength==='colegio'?210:strength==='funcionarios'?115:75;
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2;
    const radius=60+Math.random()*290;
    const ox=innerWidth*(.26+Math.random()*.48);
    const oy=innerHeight*(.2+Math.random()*.37);
    particles.push({x:ox,y:oy,vx:Math.cos(a)*radius/52,vy:Math.sin(a)*radius/65-2.2,gravity:.10+Math.random()*.09,life:65+Math.random()*55,age:0,size:3+Math.random()*8,rot:Math.random()*6.28,spin:(Math.random()-.5)*.2,color:colours[(Math.random()*colours.length)|0],shape:Math.random()>.28?'rect':'circle'});
  }
  if(!drawFrame)drawFrame=requestAnimationFrame(drawParticles);
}
function drawParticles(){ctx.clearRect(0,0,innerWidth,innerHeight);particles=particles.filter(p=>p.age++<p.life);
  for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=p.gravity;p.vx*=.994;p.rot+=p.spin;
    ctx.globalAlpha=Math.max(0,1-p.age/p.life);ctx.fillStyle=p.color;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
    if(p.shape==='rect')ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.55);
    else{ctx.beginPath();ctx.arc(0,0,p.size*.37,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  ctx.globalAlpha=1;
  if(particles.length)drawFrame=requestAnimationFrame(drawParticles);
  else{drawFrame=0;ctx.clearRect(0,0,innerWidth,innerHeight);}
}
function show(celebrate=true){
  if(!slides.length)return;
  const s=slides[index];const name=$('name'),value=$('amount');
  $('stage').dataset.scene=s.scene;
  if(s.scene==='colegio'){animateGala(s.monto ?? data.totalColegio,true);startGala();}else stopGala();
  $('category').textContent=s.category;
  name.textContent=s.nombre;
  name.className=s.nombre.length>23?'extra-long':s.nombre.length>12?'long':'';
  $('amount-label').textContent=s.scene==='colegio'?'¡JUNTOS LO HICIMOS POSIBLE!':s.scene==='funcionarios'?'¡GRACIAS POR SU GENEROSIDAD!':'¡ESTE ES SU GRAN APORTE!';
  value.className='amount'+(s.monto!=null&&digits(s.monto).length>9?' tiny':s.monto!=null&&digits(s.monto).length>7?' compact':'');
  $('message').textContent=s.scene==='colegio'?'¡UN COLEGIO, MILES DE CORAZONES!':s.scene==='funcionarios'?'¡GRACIAS A CADA FUNCIONARIO!':phrases[index%phrases.length];
  $('counter').textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
  const reveal=$('reveal');reveal.classList.remove('enter');void reveal.offsetWidth;
  if(celebrate){reveal.classList.add('enter');$('flash').classList.remove('play');void $('flash').offsetWidth;$('flash').classList.add('play');}
  animateNumber(value,s.monto);
  if(celebrate)fireworks(s.scene);
}
function move(step){if(!slides.length)return;index=(index+step+slides.length)%slides.length;show(true);}
async function refresh(){
  if(fetchBusy)return;fetchBusy=true;
  try{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    let response;
    try{response=await fetch(endpoint+'?_='+Date.now(),{cache:'no-store',signal:controller.signal});}
    finally{clearTimeout(timeout);}
    if(!response.ok)throw Error('HTTP '+response.status);
    const fresh=await response.json();
    if(fresh.error)throw Error(fresh.detalle||fresh.error);
    if(!Array.isArray(fresh.cursos)||fresh.cursos.length===0)throw Error('No hay cursos disponibles');
    const previous=slides[index]?.id;
    const prevAmount=slides[index]?.monto;
    data={cursos:fresh.cursos,funcionarios:fresh.funcionarios,totalColegio:fresh.totalColegio};
    slides=makeSlides();
    if(previous){const match=slides.findIndex(s=>s.id===previous);index=match>=0?match:Math.min(index,slides.length-1);}
    setStatus(true,'EN VIVO · '+new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}));
    // Primera carga: gran entrada. En actualizaciones, modificar solo la cifra,
    // sin animación de diapositiva, confeti ni cambio manual involuntario.
    if(!loaded){loaded=true;show(true);}
    else if(slides[index]?.monto!==prevAmount){
      const value=$('amount');const s=slides[index];
      value.className='amount'+(s.monto!=null&&digits(s.monto).length>9?' tiny':s.monto!=null&&digits(s.monto).length>7?' compact':'');
      animateNumber(value,s.monto);
      if(s.scene==='colegio'){animateGala(s.monto ?? data.totalColegio,true);fireworks('funcionarios');}
    }
  }catch(e){setStatus(false,loaded?'SIN CONEXIÓN · REINTENTANDO':'CONECTANDO…');console.warn('Teletón / Sheets:',e);}
  finally{fetchBusy=false;}
}
document.addEventListener('keydown',ev=>{
  if(['ArrowRight','ArrowDown',' ','PageDown'].includes(ev.key)){ev.preventDefault();move(1);}
  else if(['ArrowLeft','ArrowUp','PageUp'].includes(ev.key)){ev.preventDefault();move(-1);}
  else if(ev.key==='Home'){ev.preventDefault();index=0;show(true);}
  else if(ev.key==='End'){ev.preventDefault();index=Math.max(0,slides.length-1);show(true);}
  else if(ev.key.toLowerCase()==='f'){ev.preventDefault();if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.();}
  else if(ev.key.toLowerCase()==='r'){ev.preventDefault();refresh();}
});
refresh();setInterval(refresh,REFRESH_MS);
