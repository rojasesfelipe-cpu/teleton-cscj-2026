'use strict';
const REFRESH_MS = 15000;
const endpoint = '/.netlify/functions/datos';
const $ = id => document.getElementById(id);
const fmt = value => value == null ? '—' : '$' + Math.round(value).toLocaleString('es-CL');
const digits = value => value == null ? '—' : Math.round(value).toLocaleString('es-CL');
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

const coursePhrases = [
  '¡CADA APORTE CUENTA!',
  '¡GRACIAS POR SUMAR CORAZONES!',
  '¡JUNTOS HACEMOS LA DIFERENCIA!',
  '¡FELICITACIONES POR SU ENTREGA!',
  '¡SIGAMOS CRECIENDO EN SOLIDARIDAD!'
];
const finalPhrases = [
  '¡Gracias por ser parte de esta gran cruzada!',
  '¡El Sagrado Corazón late por la Teletón!',
  '¡Juntos hacemos la diferencia!',
  '¡Unidos de corazón, lo logramos!'
];

let data = { cursos: [], funcionarios: null, totalColegio: null };
let slides = [];
let index = 0;
let loaded = false;
let amountFrame = 0;
let drawFrame = 0;
let particles = [];
let fetchBusy = false;
let messageTimer = 0;
let finalCelebrationTimer = 0;

function makeSlides() {
  return [
    ...data.cursos.map((c, i) => ({
      id: 'curso:' + i + ':' + c.nombre,
      nombre: c.nombre,
      monto: c.monto,
      category: 'RECAUDACIÓN POR CURSO',
      scene: 'curso'
    })),
    {
      id: 'funcionarios',
      nombre: 'FUNCIONARIOS',
      monto: data.funcionarios,
      category: 'APORTE FUNCIONARIOS',
      scene: 'funcionarios'
    },
    {
      id: 'colegio',
      nombre: '¡LO LOGRAMOS JUNTOS!',
      monto: data.totalColegio,
      category: 'GRAN RECAUDACIÓN TELETÓN 2026',
      scene: 'colegio'
    }
  ];
}

function setStatus(ok, message) {
  $('live-dot').className = 'live-dot ' + (ok ? 'ok' : 'bad');
  $('live-text').textContent = message;
}

function animateNumber(el, value, duration = 1350) {
  cancelAnimationFrame(amountFrame);
  if (value === null || value === undefined) {
    el.textContent = 'SIN DATO';
    return;
  }
  if (prefersReduced.matches) {
    el.textContent = digits(value);
    return;
  }
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 4.4);
    el.textContent = digits(Math.round(value * eased));
    if (t < 1) amountFrame = requestAnimationFrame(tick);
  }
  amountFrame = requestAnimationFrame(tick);
}

const canvas = $('fx');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function fireworks(strength = 'curso') {
  if (prefersReduced.matches || !ctx) return;
  const colours = ['#fff4c2', '#ffe184', '#ffffff', '#ffb4cb', '#ff5875', '#ffd76b'];
  const count = strength === 'colegio' ? 220 : strength === 'funcionarios' ? 110 : 72;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const radius = 60 + Math.random() * 320;
    const ox = innerWidth * (0.24 + Math.random() * 0.52);
    const oy = innerHeight * (0.18 + Math.random() * 0.38);
    particles.push({
      x: ox,
      y: oy,
      vx: Math.cos(a) * radius / 56,
      vy: Math.sin(a) * radius / 70 - 2.2,
      gravity: 0.10 + Math.random() * 0.09,
      life: 65 + Math.random() * 55,
      age: 0,
      size: 3 + Math.random() * 8,
      rot: Math.random() * 6.28,
      spin: (Math.random() - 0.5) * 0.2,
      color: colours[(Math.random() * colours.length) | 0],
      shape: Math.random() > 0.22 ? 'rect' : 'circle'
    });
  }
  if (!drawFrame) drawFrame = requestAnimationFrame(drawParticles);
}

function drawParticles() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter(p => p.age++ < p.life);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.vx *= 0.994; p.rot += p.spin;
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
    else { ctx.beginPath(); ctx.arc(0, 0, p.size * 0.37, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (particles.length) drawFrame = requestAnimationFrame(drawParticles);
  else { drawFrame = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}

function clearTimers() {
  clearInterval(messageTimer);
  clearInterval(finalCelebrationTimer);
}

function runFinalLoop() {
  clearTimers();
  let p = 0;
  $('message').textContent = finalPhrases[0];
  messageTimer = setInterval(() => {
    if (slides[index]?.scene !== 'colegio') return;
    p = (p + 1) % finalPhrases.length;
    $('message').textContent = finalPhrases[p];
  }, 5200);
  finalCelebrationTimer = setInterval(() => {
    if (slides[index]?.scene === 'colegio') fireworks('funcionarios');
  }, 6500);
}

function show(celebrate = true) {
  if (!slides.length) return;
  const s = slides[index];
  const name = $('name');
  const value = $('amount');
  const stage = $('stage');
  const reveal = $('reveal');
  const isFinal = s.scene === 'colegio';
  const isStaff = s.scene === 'funcionarios';

  clearTimers();
  stage.dataset.scene = s.scene;
  $('category').textContent = s.category;
  $('victory-ribbon').textContent = '¡LO LOGRAMOS JUNTOS!';
  $('gratitude-text').textContent = 'Gracias a nuestros ' + data.cursos.length + ' cursos, funcionarios y familias por su compromiso y solidaridad.';
  $('amount-label').textContent = isFinal ? 'UNIDOS DE CORAZÓN' : isStaff ? '¡GRACIAS POR SU GENEROSIDAD!' : '¡ESTE ES SU GRAN APORTE!';
  $('message').textContent = isFinal ? finalPhrases[0] : isStaff ? '¡Gracias por aportar con tanto cariño!' : coursePhrases[index % coursePhrases.length];
  $('counter').textContent = String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
  $('motto').textContent = isFinal ? '¡Gracias por hacerlo posible!' : '#UnidosDeCorazón';

  name.textContent = isFinal ? '' : s.nombre;
  name.className = s.nombre && s.nombre.length > 23 ? 'extra-long' : s.nombre && s.nombre.length > 12 ? 'long' : '';
  value.className = 'amount' + (s.monto != null && digits(s.monto).length > 9 ? ' tiny' : s.monto != null && digits(s.monto).length > 7 ? ' compact' : '');

  reveal.classList.remove('enter');
  void reveal.offsetWidth;
  if (celebrate) {
    reveal.classList.add('enter');
    $('flash').classList.remove('play');
    void $('flash').offsetWidth;
    $('flash').classList.add('play');
  }
  animateNumber(value, s.monto, isFinal ? 1700 : 1250);
  if (celebrate) fireworks(s.scene);
  if (isFinal) runFinalLoop();
}

function move(step) {
  if (!slides.length) return;
  index = (index + step + slides.length) % slides.length;
  show(true);
}

async function refresh() {
  if (fetchBusy) return;
  fetchBusy = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetch(endpoint + '?_=' + Date.now(), { cache: 'no-store', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw Error('HTTP ' + response.status);
    const fresh = await response.json();
    if (fresh.error) throw Error(fresh.detalle || fresh.error);
    if (!Array.isArray(fresh.cursos) || fresh.cursos.length === 0) throw Error('No hay cursos disponibles');
    const previous = slides[index]?.id;
    const prevAmount = slides[index]?.monto;
    data = { cursos: fresh.cursos, funcionarios: fresh.funcionarios, totalColegio: fresh.totalColegio };
    slides = makeSlides();
    if (previous) {
      const match = slides.findIndex(s => s.id === previous);
      index = match >= 0 ? match : Math.min(index, slides.length - 1);
    }
    setStatus(true, 'EN VIVO · ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    if (!loaded) { loaded = true; show(true); }
    else if (slides[index]?.monto !== prevAmount) {
      const s = slides[index];
      const value = $('amount');
      value.className = 'amount' + (s.monto != null && digits(s.monto).length > 9 ? ' tiny' : s.monto != null && digits(s.monto).length > 7 ? ' compact' : '');
      animateNumber(value, s.monto, s.scene === 'colegio' ? 1700 : 1250);
      if (s.scene === 'colegio') fireworks('funcionarios');
    }
  } catch (e) {
    setStatus(false, loaded ? 'SIN CONEXIÓN · REINTENTANDO' : 'CONECTANDO…');
    console.warn('Teletón / Sheets:', e);
  } finally {
    fetchBusy = false;
  }
}

document.addEventListener('keydown', ev => {
  if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(ev.key)) { ev.preventDefault(); move(1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(ev.key)) { ev.preventDefault(); move(-1); }
  else if (ev.key === 'Home') { ev.preventDefault(); index = 0; show(true); }
  else if (ev.key === 'End') { ev.preventDefault(); index = Math.max(0, slides.length - 1); show(true); }
  else if (ev.key.toLowerCase() === 'f') { ev.preventDefault(); if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); }
  else if (ev.key.toLowerCase() === 'r') { ev.preventDefault(); refresh(); }
});

refresh();
setInterval(refresh, REFRESH_MS);
