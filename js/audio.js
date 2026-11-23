/* Multimetrónomo · audio.js
   Web Audio y planificador con margen: cada 25 ms se programan los clics que caen en los próximos 120 ms
   con la hora exacta del reloj de audio. La cola `queue` guarda cada pulso para que pulso.js dibuje en sincronía. */
'use strict';

let ctx = null, schedTimer = null, nextT = 0, beatN = 0, queue = [], wake = null;
const AHEAD = 0.12, TICK = 25;

async function ensureAudio() {
  try {
    // iOS (Safari 17+): que suene aunque el interruptor de silencio esté activado
    if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) {} }
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') await ctx.resume();
    return true;
  } catch (e) {
    toast('Este navegador no puede reproducir sonido.');
    return false;
  }
}

// Un clic corto y seco (todos iguales: sin acento)
function click(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = 1250;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.8, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + 0.08);
}

function sched() {
  // Tras una pausa del hilo principal (pestaña en segundo plano, móvil lento) no se hacen sonar de golpe los atrasados
  if (nextT < ctx.currentTime - 0.02) nextT = ctx.currentTime + 0.03;
  while (nextT < ctx.currentTime + AHEAD) {
    if (st.sound) click(nextT);
    queue.push({ t: nextT, n: beatN, d: 60 / st.bpm });
    nextT += 60 / st.bpm; beatN++;
  }
  if (queue.length > 8) queue.splice(0, queue.length - 8);
}

// Hora a la que se oye lo que suena ahora (descuenta la latencia de salida)
function heard() {
  if (!ctx) return 0;
  try {
    const ts = ctx.getOutputTimestamp && ctx.getOutputTimestamp();
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
  } catch (e) {}
  return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
}

async function keepAwake() {
  try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) {}
}

async function start() {
  if (ui.playing) return;
  if (!(await ensureAudio())) return;
  ui.playing = true; beatN = 0; queue = [];
  nextT = ctx.currentTime + 0.08;
  sched(); schedTimer = setInterval(sched, TICK);
  keepAwake();
  paintPlay(); say('Metrónomo en marcha, ' + st.bpm + ' pulsos por minuto');
}
function stop() {
  if (!ui.playing) return;
  ui.playing = false; clearInterval(schedTimer); schedTimer = null; queue = [];
  try { if (wake) wake.release(); } catch (e) {}
  wake = null;
  paintPlay(); draw(); say('Metrónomo detenido');
}
const toggle = () => (ui.playing ? stop() : start());

// Al volver a la app: reanudar el audio (iOS lo deja «interrupted» tras una llamada) y volver a pedir la pantalla encendida
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ui.playing) { ensureAudio(); keepAwake(); }
});
