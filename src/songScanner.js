/**
 * songScanner.js · BlackMamba Intelligent Song Scanner & Vocal Stem Consciousness Engine
 * 
 * 1. Separa la canción en stems (Voz Aislada e Instrumental) de forma automática.
 * 2. Genera el mapa de consciencia temporal (Intro, Estrofas, Solos instrumentales, Cuentas regresivas).
 * 3. Extrae el rastro melódico limpio analizando únicamente el stem vocal (sin interferencias de bajo ni batería).
 * 4. Transcribe la letra REAL mediante Whisper sobre el stem vocal aislado (sin inventar palabras de plantillas).
 */

import { pitch, noteFor } from './audio';
import { translateText } from './liveSpeech';
import { separateStems } from './stemSeparator';

const SCAN_CACHE = new Map();

/**
 * Escanea un AudioBuffer completo, separa stems y extrae letra real.
 */
export async function scanFullSong(audioBuffer, fileName = 'Audio') {
  if (!audioBuffer) return null;

  const cacheKey = `${fileName}_${audioBuffer.length}_${audioBuffer.sampleRate}`;
  if (SCAN_CACHE.has(cacheKey)) {
    return SCAN_CACHE.get(cacheKey);
  }

  const sampleRate = audioBuffer.sampleRate;
  const totalDuration = audioBuffer.duration;

  // 1. Separación de Stems y Mapa de Consciencia Acústica
  const stemsData = await separateStems(audioBuffer);
  const vocalBuffer = stemsData.vocals;
  const vocalChannel = vocalBuffer.getChannelData(0);
  const totalSamples = vocalChannel.length;

  // 2. Escaneo de tono sobre el STEM VOCAL LIMPIO (elimina artefactos de bombo/bajo)
  const windowSize = 2048;
  const hopSize = 2048;
  const totalSteps = Math.floor((totalSamples - windowSize) / hopSize);

  const rawPitches = [];
  const sampleWindow = new Float32Array(windowSize);

  for (let step = 0; step < totalSteps; step++) {
    const offset = step * hopSize;
    sampleWindow.set(vocalChannel.subarray(offset, offset + windowSize));

    let sum = 0;
    for (let i = 0; i < windowSize; i++) {
      sum += sampleWindow[i] * sampleWindow[i];
    }
    const rms = Math.sqrt(sum / windowSize);

    // Solo analizar donde el stem vocal tiene energía
    if (rms > 0.012) {
      const hz = pitch(sampleWindow, sampleRate);
      if (hz && hz >= 110 && hz <= 1100) {
        const timeSec = offset / sampleRate;
        const noteInfo = noteFor(hz);
        if (noteInfo) {
          rawPitches.push({
            time: timeSec,
            hz,
            note: noteInfo.name,
            cents: noteInfo.cents,
            rms
          });
        }
      }
    }
  }

  // Agrupar puntos continuos en notas melódicas sostenidas
  const notesTimeline = [];
  if (rawPitches.length > 0) {
    let currentBlock = {
      note: rawPitches[0].note,
      hz: rawPitches[0].hz,
      start: rawPitches[0].time,
      dur: 0.1,
      count: 1
    };

    for (let i = 1; i < rawPitches.length; i++) {
      const p = rawPitches[i];
      const timeDiff = p.time - (currentBlock.start + currentBlock.dur);

      if (p.note === currentBlock.note && timeDiff < 0.2) {
        currentBlock.dur = p.time - currentBlock.start + 0.1;
        currentBlock.count++;
      } else {
        if (currentBlock.dur >= 0.14) {
          notesTimeline.push({
            id: `n_${notesTimeline.length}`,
            note: currentBlock.note,
            hz: currentBlock.hz,
            start: Math.round(currentBlock.start * 100) / 100,
            dur: Math.round(Math.max(0.2, currentBlock.dur) * 100) / 100,
            word: ''
          });
        }
        currentBlock = {
          note: p.note,
          hz: p.hz,
          start: p.time,
          dur: 0.1,
          count: 1
        };
      }
    }

    if (currentBlock.dur >= 0.14) {
      notesTimeline.push({
        id: `n_${notesTimeline.length}`,
        note: currentBlock.note,
        hz: currentBlock.hz,
        start: Math.round(currentBlock.start * 100) / 100,
        dur: Math.round(Math.max(0.2, currentBlock.dur) * 100) / 100,
        word: ''
      });
    }
  }

  // 3. Extracción de Letra Real con Whisper sobre el Stem Vocal
  let lines = [];
  let isRealLyrics = false;
  let modelUsed = 'Web Audio Analysis';

  const bridge = typeof window !== 'undefined' ? window.blackmambaSpeech : null;

  if (bridge && typeof bridge.transcribeSong === 'function' && stemsData.vocalWav) {
    try {
      const transcriptionResult = await bridge.transcribeSong(stemsData.vocalWav, 'auto');
      if (transcriptionResult && transcriptionResult.segments && transcriptionResult.segments.length > 0) {
        isRealLyrics = true;
        modelUsed = transcriptionResult.modelUsed || 'Whisper';

        lines = transcriptionResult.segments.map((seg, idx) => {
          const rawText = seg.text;
          const translated = translateText(rawText);
          return {
            id: `w_line_${idx}`,
            text: rawText,
            translation: translated !== rawText ? translated : '',
            time: seg.start,
            duration: Math.max(1.5, seg.duration)
          };
        });
      }
    } catch (err) {
      console.warn('Transcripción con Whisper en stem vocal no disponible:', err);
    }
  }

  // 4. Si Whisper no devolvió texto o estamos en navegador web sin puente:
  // Crear líneas conscientes estructuradas según el mapa de secciones (sin inventar letras de plantilla)
  if (lines.length === 0) {
    const vocalSections = stemsData.consciousnessMap.sections.filter(s => s.type === 'vocal');

    if (vocalSections.length > 0) {
      lines = stemsData.consciousnessMap.sections.map((sec, idx) => {
        if (sec.type === 'vocal') {
          return {
            id: `sec_${idx}`,
            text: `[Voz / Melodía Cantada]`,
            translation: `Sección cantada (${sec.start}s - ${sec.end}s)`,
            time: sec.start,
            duration: sec.duration
          };
        } else {
          return {
            id: `sec_${idx}`,
            text: `[${sec.label}]`,
            translation: `Solo instrumental`,
            time: sec.start,
            duration: sec.duration
          };
        }
      });
    } else {
      lines = [
        {
          id: 'l_inst',
          text: '[Pista Instrumental / Sin Letra Detectada]',
          translation: 'Música instrumental',
          time: 0,
          duration: totalDuration
        }
      ];
    }
  }

  // 5. Asignar palabras a las notas
  if (notesTimeline.length > 0) {
    notesTimeline.forEach(nItem => {
      const activeLine = lines.find(l => nItem.start >= l.time && nItem.start < l.time + l.duration);
      if (activeLine && activeLine.text && !activeLine.text.startsWith('[')) {
        const words = activeLine.text.split(' ').filter(w => w.trim().length > 0);
        const progress = (nItem.start - activeLine.time) / activeLine.duration;
        const wIdx = Math.min(words.length - 1, Math.floor(progress * words.length));
        nItem.word = words[wIdx] || nItem.note;
      } else {
        nItem.word = nItem.note;
      }
    });
  }

  const result = {
    fileName,
    duration: Math.round(totalDuration * 10) / 10,
    totalNotes: notesTimeline.length,
    notesTimeline,
    lines,
    stems: {
      vocals: stemsData.vocals,
      instrumental: stemsData.instrumental
    },
    consciousnessMap: stemsData.consciousnessMap,
    isRealLyrics,
    modelUsed,
    scannedAt: Date.now()
  };

  SCAN_CACHE.set(cacheKey, result);
  return result;
}
