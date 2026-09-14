/**
 * stemSeparator.js · BlackMamba Intelligent Stem Separation & Vocal Consciousness Engine
 * 
 * Separa audio en Stems (Pista Vocal vs Pista Instrumental) y genera el mapa de consciencia
 * acústica temporal (detección de secciones, momentos de voz, solos instrumentales y cuentas regresivas).
 */

import { encodeWav } from './speech';

/**
 * Filtro biquad IIR pasa-banda para aislar formantes vocales (120 Hz - 3800 Hz)
 */
function createVocalBandFilter(sampleRate) {
  // Filtro pasa-altos ~120 Hz para eliminar bombo y sub-bajo
  const f_hp = 120;
  const w0_hp = 2 * Math.PI * f_hp / sampleRate;
  const cos_hp = Math.cos(w0_hp);
  const sin_hp = Math.sin(w0_hp);
  const alpha_hp = sin_hp / (2 * 0.707);
  const a0_hp = 1 + alpha_hp;
  const hp = {
    b0: ((1 + cos_hp) / 2) / a0_hp,
    b1: (-(1 + cos_hp)) / a0_hp,
    b2: ((1 + cos_hp) / 2) / a0_hp,
    a1: (-2 * cos_hp) / a0_hp,
    a2: (1 - alpha_hp) / a0_hp,
    x1: 0, x2: 0, y1: 0, y2: 0
  };

  // Filtro pasa-bajos ~3800 Hz para eliminar platillos y siseo
  const f_lp = 3800;
  const w0_lp = 2 * Math.PI * f_lp / sampleRate;
  const cos_lp = Math.cos(w0_lp);
  const sin_lp = Math.sin(w0_lp);
  const alpha_lp = sin_lp / (2 * 0.707);
  const a0_lp = 1 + alpha_lp;
  const lp = {
    b0: ((1 - cos_lp) / 2) / a0_lp,
    b1: (1 - cos_lp) / a0_lp,
    b2: ((1 - cos_lp) / 2) / a0_lp,
    a1: (-2 * cos_lp) / a0_lp,
    a2: (1 - alpha_lp) / a0_lp,
    x1: 0, x2: 0, y1: 0, y2: 0
  };

  return {
    process(sample) {
      // Paso 1: HPF
      const y_hp = hp.b0 * sample + hp.b1 * hp.x1 + hp.b2 * hp.x2 - hp.a1 * hp.y1 - hp.a2 * hp.y2;
      hp.x2 = hp.x1; hp.x1 = sample; hp.y2 = hp.y1; hp.y1 = y_hp;

      // Paso 2: LPF
      const y_lp = lp.b0 * y_hp + lp.b1 * lp.x1 + lp.b2 * lp.x2 - lp.a1 * lp.y1 - lp.a2 * lp.y2;
      lp.x2 = lp.x1; lp.x1 = y_hp; lp.y2 = lp.y1; lp.y1 = y_lp;

      return y_lp;
    }
  };
}

/**
 * Separa un AudioBuffer en stems: Voz aislada e Instrumental
 * y calcula el mapa de consciencia temporal de la canción.
 * 
 * @param {AudioBuffer} audioBuffer
 * @param {AudioContext} audioCtx
 * @returns {Promise<{
 *   vocals: AudioBuffer,
 *   instrumental: AudioBuffer,
 *   vocalWav: ArrayBuffer,
 *   consciousnessMap: {
 *     timeline: Array<{ time: number, vocalEnergy: number, isVocal: boolean }>,
 *     sections: Array<{ type: 'intro'|'vocal'|'instrumental'|'outro', start: number, end: number, label: string }>,
 *     vocalCoveragePercent: number
 *   }
 * }>}
 */
export async function separateStems(audioBuffer, audioCtx) {
  if (!audioBuffer) return null;

  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

  // Crear buffers de salida
  const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const vocalBuffer = ctx.createBuffer(numChannels, length, sampleRate);
  const instBuffer = ctx.createBuffer(numChannels, length, sampleRate);

  const vocalOutL = vocalBuffer.getChannelData(0);
  const vocalOutR = numChannels > 1 ? vocalBuffer.getChannelData(1) : null;
  const instOutL = instBuffer.getChannelData(0);
  const instOutR = numChannels > 1 ? instBuffer.getChannelData(1) : null;

  const filterL = createVocalBandFilter(sampleRate);
  const filterR = createVocalBandFilter(sampleRate);

  // Parámetros de consciencia temporal
  const blockSize = Math.floor(sampleRate * 0.1); // bloques de 100 ms
  const totalBlocks = Math.ceil(length / blockSize);
  const consciousnessTimeline = [];

  let vocalBlockCount = 0;

  for (let b = 0; b < totalBlocks; b++) {
    const start = b * blockSize;
    const end = Math.min(length, start + blockSize);
    let blockVocalEnergySum = 0;

    for (let i = start; i < end; i++) {
      const l = leftChannel[i];
      const r = rightChannel[i];

      // Mid / Side decomposition
      const mid = 0.5 * (l + r);
      const side = 0.5 * (l - r);

      // Extracción del centro vocal con cancelación lateral
      const sideMag = Math.abs(side);
      const centerFactor = Math.max(0, 1 - (sideMag * 2.2));
      const rawVocal = mid * centerFactor;

      // Filtrado por resonancia vocal
      const filteredVocalL = filterL.process(rawVocal);
      const filteredVocalR = filterR.process(rawVocal);

      // Asignar al canal vocal
      vocalOutL[i] = filteredVocalL;
      if (vocalOutR) vocalOutR[i] = filteredVocalR;

      // Instrumental: Sustracción de la componente vocal centrada del original
      const vocalBleed = filteredVocalL * 1.1;
      instOutL[i] = l - vocalBleed;
      if (instOutR) instOutR[i] = r - vocalBleed;

      blockVocalEnergySum += filteredVocalL * filteredVocalL;
    }

    const rms = Math.sqrt(blockVocalEnergySum / (end - start));
    const isVocal = rms > 0.014;
    if (isVocal) vocalBlockCount++;

    consciousnessTimeline.push({
      time: Math.round((start / sampleRate) * 10) / 10,
      vocalEnergy: Math.round(rms * 1000) / 1000,
      isVocal
    });
  }

  // Identificar secciones conscientes de la canción (Intro, Versos, Solos/Instrumental, Outro)
  const sections = [];
  let currentSection = null;

  for (let i = 0; i < consciousnessTimeline.length; i++) {
    const item = consciousnessTimeline[i];
    const isV = item.isVocal;

    if (!currentSection) {
      currentSection = {
        isVocal: isV,
        start: item.time,
        end: item.time + 0.1
      };
    } else if (currentSection.isVocal === isV) {
      currentSection.end = item.time + 0.1;
    } else {
      // Cambio de sección si dura al menos 1.2 segundos
      if (currentSection.end - currentSection.start >= 1.2) {
        sections.push({ ...currentSection });
        currentSection = {
          isVocal: isV,
          start: item.time,
          end: item.time + 0.1
        };
      } else {
        currentSection.isVocal = isV;
        currentSection.end = item.time + 0.1;
      }
    }
  }
  if (currentSection) sections.push(currentSection);

  // Etiquetar secciones con semántica consciente
  const labeledSections = sections.map((sec, idx) => {
    let type = 'instrumental';
    let label = 'Solo Instrumental';

    if (idx === 0 && !sec.isVocal) {
      type = 'intro';
      label = 'Introducción Musical';
    } else if (idx === sections.length - 1 && !sec.isVocal) {
      type = 'outro';
      label = 'Cierre / Outro';
    } else if (sec.isVocal) {
      type = 'vocal';
      label = `Estrofa Vocal #${idx + 1}`;
    } else {
      type = 'instrumental';
      label = 'Pausa Instrumental';
    }

    return {
      type,
      start: Math.round(sec.start * 10) / 10,
      end: Math.round(sec.end * 10) / 10,
      duration: Math.round((sec.end - sec.start) * 10) / 10,
      label
    };
  });

  // Generar WAV mono a 16kHz del stem vocal para transcripción directa con Whisper
  const vocalWav = encodeWav(vocalOutL, sampleRate);

  const coveragePercent = Math.round((vocalBlockCount / totalBlocks) * 100);

  return {
    vocals: vocalBuffer,
    instrumental: instBuffer,
    vocalWav,
    consciousnessMap: {
      timeline: consciousnessTimeline,
      sections: labeledSections,
      vocalCoveragePercent: coveragePercent
    }
  };
}

/**
 * Devuelve el estado de consciencia en un segundo exacto:
 * ¿Qué sección es? ¿Hay voz o instrumental? ¿Cuántos segundos faltan para la próxima voz?
 */
export function getConsciousnessAtTime(consciousnessMap, currentTime) {
  if (!consciousnessMap || !consciousnessMap.sections) {
    return {
      section: 'Analizando',
      isVocal: true,
      countdownToVocal: 0,
      hint: ''
    };
  }

  const { sections } = consciousnessMap;
  const activeSec = sections.find(s => currentTime >= s.start && currentTime <= s.end);

  // Si estamos en pausa instrumental, calcular cuenta regresiva para la siguiente entrada vocal
  let countdownToVocal = 0;
  let nextVocalSec = null;

  if (activeSec && activeSec.type !== 'vocal') {
    nextVocalSec = sections.find(s => s.type === 'vocal' && s.start > currentTime);
    if (nextVocalSec) {
      countdownToVocal = Math.max(0, Math.ceil(nextVocalSec.start - currentTime));
    }
  }

  return {
    section: activeSec ? activeSec.label : 'En reproducción',
    type: activeSec ? activeSec.type : 'vocal',
    isVocal: activeSec ? activeSec.type === 'vocal' : true,
    countdownToVocal,
    hint: countdownToVocal > 0 && countdownToVocal <= 5
      ? `🎤 ¡Voz entra en ${countdownToVocal}s!`
      : (activeSec?.type !== 'vocal' ? '🎵 Solo Instrumental' : '🎤 Voz en vivo')
  };
}
