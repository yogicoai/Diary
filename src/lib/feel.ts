// 소리·진동 (녹음 파일 없이 브라우저에서 만든다)
//   크레파스: 긋는 속도만큼 커지는 "사각사각" + 안드로이드 짧은 진동
//   원고지: 글자마다 연필 "톡" / 선생님 밑줄: "쓱" / 도장: "쿵"
// "나 → 기본 설정"에서 끄고 켠다. 아이폰 웹은 진동을 막아 둬서 소리만 난다.

const SOUND_KEY = "chamjal.sound";
const HAPTIC_KEY = "chamjal.haptic";

function flag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}
export const soundOn = () => flag(SOUND_KEY);
export const hapticOn = () => flag(HAPTIC_KEY);
export function setSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* 무시 */
  }
}
export function setHaptic(on: boolean) {
  try {
    localStorage.setItem(HAPTIC_KEY, on ? "on" : "off");
  } catch {
    /* 무시 */
  }
}

export function buzz(pattern: number | number[]) {
  if (hapticOn()) navigator.vibrate?.(pattern);
}

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (!soundOn() || typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      // 거친 종이 결: 흰 소음에 가끔 튀는 알갱이
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.04 ? 1 : 0.45);
    }
    return ctx;
  } catch {
    return null;
  }
}

function noiseSource(a: AudioContext) {
  const s = a.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.loopStart = Math.random() * 0.5;
  return s;
}

/** 짧은 소음 한 번 (연필 톡, 밑줄 쓱) */
function burst(freq: number, q: number, gain: number, dur: number, sweepTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const src = noiseSource(a);
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(freq, t);
  if (sweepTo) bp.frequency.linearRampToValueAtTime(sweepTo, t + dur);
  bp.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(0.012, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** 원고지에 글자 하나 */
export function pencilTick() {
  burst(3200 + Math.random() * 900, 1.4, 0.18, 0.045);
}

/** 선생님 빨간 밑줄 한 줄 */
export function underlineSwish(dur = 0.32) {
  burst(1400, 0.9, 0.16, dur, 2600);
}

/** 도장 쿵 */
export function stampThump() {
  const a = audio();
  if (a) {
    const t = a.currentTime;
    const o = a.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.22);
    const g = a.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.32);
    burst(900, 0.7, 0.25, 0.06);
  }
  buzz([14, 50, 26]);
}

/** 크레파스 한 획: 누를 때 start, 움직일 때 move(속도), 뗄 때 end */
export function crayonStroke(erase = false) {
  const a = audio();
  let src: AudioBufferSourceNode | null = null;
  let bp: BiquadFilterNode | null = null;
  let g: GainNode | null = null;
  if (a) {
    src = noiseSource(a);
    const hp = a.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = erase ? 250 : 700;
    bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = erase ? 600 : 1800;
    bp.Q.value = 0.8;
    g = a.createGain();
    g.gain.value = 0;
    src.connect(hp).connect(bp).connect(g).connect(a.destination);
    src.start();
  }
  let dist = 0;
  return {
    /** speed = 화면 px/ms, step = 이번에 움직인 px */
    move(speed: number, step: number) {
      if (a && g && bp) {
        const t = a.currentTime;
        const level = Math.min(0.32, 0.05 + speed * 0.16) * (erase ? 0.7 : 1);
        g.gain.setTargetAtTime(level * (0.8 + Math.random() * 0.4), t, 0.02);
        bp.frequency.setTargetAtTime((erase ? 500 : 1300) + Math.min(speed, 2) * 900, t, 0.04);
        g.gain.setTargetAtTime(0, t + 0.09, 0.05); // 멈추면 소리도 잦아든다
      }
      dist += step;
      if (dist > 26) {
        dist = 0;
        buzz(4);
      }
    },
    end() {
      if (a && g && src) {
        const t = a.currentTime;
        g.gain.setTargetAtTime(0, t, 0.03);
        src.stop(t + 0.15);
      }
    },
  };
}
