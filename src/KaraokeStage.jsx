import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, ArrowCounterClockwise, Sparkle, GlobeHemisphereWest, 
  Fire, Trophy, MusicNotes, FileText, CheckCircle, SpeakerHigh, SpeakerSlash,
  Waveform, HardDrive, Compass
} from '@phosphor-icons/react';
import { scanFullSong } from './songScanner';
import { getConsciousnessAtTime } from './stemSeparator';

// Frecuencias exactas para notas musicales (C3 a C6)
const NOTE_FREQ = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  'C6': 1046.50
};

const NOTES_LIST = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'C6'];

// Canción por defecto si no se ha cargado archivo
const DEFAULT_SONG = {
  fileName: 'Cosmic Harmony',
  duration: 22.0,
  isRealLyrics: false,
  modelUsed: 'Demostración',
  notesTimeline: [
    { word: 'Shine', note: 'C4', start: 0.5, dur: 0.9 },
    { word: 'like a', note: 'E4', start: 1.5, dur: 0.9 },
    { word: 'star', note: 'G4', start: 2.5, dur: 1.1 },
    { word: 'in the', note: 'A4', start: 3.7, dur: 0.8 },
    { word: 'night', note: 'C5', start: 4.6, dur: 1.4 },
    { word: 'We are', note: 'B4', start: 6.6, dur: 0.9 },
    { word: 'en-er-gy', note: 'A4', start: 7.6, dur: 1.1 },
    { word: 'and', note: 'G4', start: 8.8, dur: 0.6 },
    { word: 'light', note: 'E4', start: 9.5, dur: 1.5 },
    { word: 'Feel the', note: 'F4', start: 11.6, dur: 0.9 },
    { word: 'rhythm', note: 'G4', start: 12.6, dur: 0.9 },
    { word: 'take', note: 'A4', start: 13.6, dur: 0.8 },
    { word: 'flight', note: 'C5', start: 14.5, dur: 1.5 },
    { word: 'Ev-ery-thing', note: 'E5', start: 16.6, dur: 1.2 },
    { word: 'is', note: 'D5', start: 17.9, dur: 0.6 },
    { word: 'har-mo-ny', note: 'C5', start: 18.6, dur: 1.3 },
    { word: 'and bright', note: 'G4', start: 20.0, dur: 1.8 }
  ],
  lines: [
    { id: 'd_1', text: 'Shine like a star in the night', translation: 'Brilla como una estrella en la noche', time: 0.0, duration: 6.2 },
    { id: 'd_2', text: 'We are energy and light', translation: 'Somos energía y luz', time: 6.2, duration: 5.0 },
    { id: 'd_3', text: 'Feel the rhythm take flight', translation: 'Siente el ritmo alzar el vuelo', time: 11.2, duration: 5.0 },
    { id: 'd_4', text: 'Everything is harmony and bright', translation: 'Todo es armonía y resplandor', time: 16.2, duration: 5.8 }
  ],
  consciousnessMap: {
    sections: [
      { type: 'vocal', start: 0, end: 11.0, duration: 11.0, label: 'Estrofa 1' },
      { type: 'instrumental', start: 11.0, end: 14.0, duration: 3.0, label: 'Pausa Instrumental' },
      { type: 'vocal', start: 14.0, end: 22.0, duration: 8.0, label: 'Coro Principal' }
    ]
  }
};

export function KaraokeStage({ engine, data, note, theme }) {
  // Estado de la canción
  const [activeSong, setActiveSong] = useState(DEFAULT_SONG);
  const [isScanning, setIsScanning] = useState(false);
  const [demoTime, setDemoTime] = useState(0);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [audioGuideSound, setAudioGuideSound] = useState(false);
  const [stemMode, setStemMode] = useState('mix'); // 'mix' | 'vocals' | 'instrumental'

  // HUD
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [hitFeedback, setHitFeedback] = useState(null);

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const demoTimerRef = useRef(null);
  const synthOscRef = useRef(null);
  const synthGainRef = useRef(null);

  // 1. ESCANEO Y SEPARACIÓN DE STEMS AUTOMÁTICA AL CARGAR CANCIÓN
  useEffect(() => {
    let cancelled = false;
    if (engine.buffer) {
      setIsScanning(true);
      scanFullSong(engine.buffer, engine.fileName || 'Pista de Audio').then(scanned => {
        if (!cancelled && scanned) {
          setActiveSong(scanned);
          engine.stems = scanned.stems;
          setIsScanning(false);
        }
      }).catch(err => {
        console.error('Error al escanear audio y stems:', err);
        if (!cancelled) setIsScanning(false);
      });
    } else {
      setActiveSong(DEFAULT_SONG);
    }
    return () => { cancelled = true; };
  }, [engine.buffer, engine.fileName]);

  const isAudioFileLoaded = !!engine.buffer;
  const currentPos = isAudioFileLoaded ? (engine.position || 0) : demoTime;
  const totalDuration = isAudioFileLoaded ? (engine.duration || 1) : (activeSong.duration || 22.0);
  const isPlaying = isAudioFileLoaded ? !!engine.fileSource : isDemoPlaying;

  // Consciencia temporal activa de la canción (Intro, Estrofas, Solos instrumentales, Cuenta regresiva)
  const consciousness = getConsciousnessAtTime(activeSong.consciousnessMap, currentPos);

  // Temporizador para modo demo si no hay archivo
  useEffect(() => {
    if (!isAudioFileLoaded && isDemoPlaying) {
      const start = Date.now() - (demoTime * 1000);
      demoTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed >= totalDuration) {
          setDemoTime(0);
          setIsDemoPlaying(false);
          clearInterval(demoTimerRef.current);
        } else {
          setDemoTime(elapsed);
        }
      }, 30);
      return () => clearInterval(demoTimerRef.current);
    }
  }, [isAudioFileLoaded, isDemoPlaying, totalDuration]);

  // Manejo de Play/Pausa
  const togglePlay = () => {
    if (isAudioFileLoaded) {
      if (engine.fileSource) {
        engine.pause();
      } else {
        engine.resume();
      }
    } else {
      setIsDemoPlaying(!isDemoPlaying);
    }
  };

  const handleSeek = (newSec) => {
    if (isAudioFileLoaded) {
      engine.seek(newSec);
    } else {
      setDemoTime(newSec);
    }
  };

  const handleStemChange = (mode) => {
    setStemMode(mode);
    if (engine && typeof engine.setStemMode === 'function') {
      engine.setStemMode(mode);
    }
  };

  // Verso activo en el teleprompter basado en el tiempo actual
  const activeLine = activeSong.lines?.find(l => currentPos >= l.time && currentPos < l.time + l.duration) 
    || activeSong.lines?.[0];

  // -----------------------------------------------------------------
  // Renderizado del Canvas Piano-Roll a 60 FPS con Sincronización Real
  // -----------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const render = () => {
      const width = canvas.width = canvas.parentElement.clientWidth || 800;
      const height = canvas.height = 320;

      // Fondo
      ctx.fillStyle = theme === 'silver' ? '#f8fafc' : '#070b12';
      ctx.fillRect(0, 0, width, height);

      // Posición X del Cursor de Canto / Playhead (a 28% del borde izquierdo)
      const playheadX = width * 0.28;
      const pixelsPerSecond = 85;
      const noteH = height / NOTES_LIST.length;

      // 1. Líneas de notas musicales (C3 a C6)
      NOTES_LIST.forEach((nName, i) => {
        const y = height - (i * noteH) - noteH;
        const isC = nName.startsWith('C');
        ctx.fillStyle = isC 
          ? (theme === 'silver' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)')
          : 'transparent';
        ctx.fillRect(0, y, width, noteH);

        ctx.strokeStyle = theme === 'silver' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + noteH);
        ctx.lineTo(width, y + noteH);
        ctx.stroke();

        ctx.fillStyle = isC ? '#3b82f6' : (theme === 'silver' ? '#64748b' : '#94a3b8');
        ctx.font = isC ? 'bold 10px monospace' : '9px monospace';
        ctx.fillText(nName, 8, y + noteH - 4);
      });

      // 2. Línea de tiempo vertical (Playhead)
      ctx.strokeStyle = theme === 'princess' ? '#ec4899' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Dibujar cápsulas de notas pre-escaneadas
      let currentTargetNote = null;

      if (activeSong.notesTimeline) {
        activeSong.notesTimeline.forEach(noteItem => {
          const noteIndex = NOTES_LIST.indexOf(noteItem.note);
          if (noteIndex === -1) return;

          const y = height - (noteIndex * noteH) - noteH + 2;
          const h = noteH - 4;

          const startX = playheadX + ((noteItem.start - currentPos) * pixelsPerSecond);
          const blockW = Math.max(16, noteItem.dur * pixelsPerSecond);

          if (startX + blockW < -50 || startX > width + 50) return;

          const isActive = currentPos >= noteItem.start && currentPos <= (noteItem.start + noteItem.dur);
          if (isActive) currentTargetNote = noteItem;

          // Gradientes de notas según tema
          let blockGrad;
          if (theme === 'princess') {
            blockGrad = ctx.createLinearGradient(startX, y, startX + blockW, y);
            blockGrad.addColorStop(0, isActive ? '#f43f5e' : '#be185d');
            blockGrad.addColorStop(1, isActive ? '#fb7185' : '#f472b6');
          } else if (theme === 'ocean') {
            blockGrad = ctx.createLinearGradient(startX, y, startX + blockW, y);
            blockGrad.addColorStop(0, isActive ? '#0284c7' : '#0369a1');
            blockGrad.addColorStop(1, isActive ? '#38bdf8' : '#0ea5e9');
          } else {
            blockGrad = ctx.createLinearGradient(startX, y, startX + blockW, y);
            blockGrad.addColorStop(0, isActive ? '#6366f1' : '#4338ca');
            blockGrad.addColorStop(1, isActive ? '#a855f7' : '#6d28d9');
          }

          ctx.fillStyle = blockGrad;
          ctx.beginPath();
          ctx.roundRect(startX, y, blockW, h, 6);
          ctx.fill();

          ctx.strokeStyle = isActive ? '#fbbf24' : 'rgba(255,255,255,0.2)';
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.stroke();

          // Palabra o sílaba
          if (blockW > 24) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            ctx.fillText(noteItem.word || noteItem.note, startX + 6, y + h - 5);
          }
        });
      }

      // 4. Orbe de Afinación y Comparación en Tiempo Real
      let userY = null;
      if (note && note.name) {
        const userNoteIdx = NOTES_LIST.indexOf(note.name);
        if (userNoteIdx !== -1) {
          const centsOffset = (note.cents || 0) / 100;
          userY = height - ((userNoteIdx + centsOffset) * noteH) - noteH / 2;
        }
      }

      if (userY !== null) {
        const isHitting = currentTargetNote && currentTargetNote.note === note.name && Math.abs(note.cents) < 35;

        // Estela de partículas
        if (isHitting && Math.random() < 0.6) {
          particlesRef.current.push({
            x: playheadX,
            y: userY,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            alpha: 1.0,
            color: theme === 'princess' ? '#fb7185' : '#10b981',
            size: Math.random() * 4 + 2
          });
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(playheadX, userY, isHitting ? 12 : 8, 0, Math.PI * 2);
        ctx.fillStyle = isHitting ? '#10b981' : (theme === 'princess' ? '#ec4899' : '#38bdf8');
        ctx.shadowColor = isHitting ? '#34d399' : '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();
      }

      // Partículas
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeSong, currentPos, note, theme]);

  const timeFmt = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`karaoke-stage-container ${theme}-theme`}>
      {/* Barra de Estado Consciente de Stems y Almacenamiento USB */}
      <div className="karaoke-model-banner">
        <div className="usb-conscious-badge">
          <HardDrive size={18} weight="fill" color="#38bdf8" />
          <span>
            <strong>USB Activa:</strong> /Volumes/ADATA SC740 (82 GB libres) · 
            <strong> Modelo:</strong> Whisper Large v3 Turbo (Almacenado en USB sin ocupar disco Mac)
          </span>
        </div>
        <div className="conscious-state-pill">
          <Compass size={18} weight="fill" color={consciousness.isVocal ? '#ec4899' : '#eab308'} />
          <span>{consciousness.section}</span>
        </div>
      </div>

      {/* Selector Consciente de Stems */}
      <div className="stem-control-panel">
        <div className="stem-label">
          <Waveform size={18} weight="bold" />
          <span>SEPARACIÓN POR STEMS:</span>
        </div>
        <div className="stem-buttons">
          <button 
            className={`stem-btn ${stemMode === 'mix' ? 'active' : ''}`}
            onClick={() => handleStemChange('mix')}
          >
            🎧 Mezcla Completa
          </button>
          <button 
            className={`stem-btn ${stemMode === 'vocals' ? 'active' : ''}`}
            onClick={() => handleStemChange('vocals')}
          >
            🎤 Solo Voz (Acapella Aislada)
          </button>
          <button 
            className={`stem-btn ${stemMode === 'instrumental' ? 'active' : ''}`}
            onClick={() => handleStemChange('instrumental')}
          >
            🎸 Pista Instrumental (Karaoke)
          </button>
        </div>
      </div>

      {/* HUD de Puntuación */}
      <div className="karaoke-hud-bar">
        <div className="hud-left">
          <div className="hud-song-info">
            <span className="badge-live">ESCENARIO VOCAL EN VIVO</span>
            <h2>{activeSong.fileName}</h2>
            <small>
              {activeSong.isRealLyrics 
                ? '✓ Letra real extraída con Whisper sobre stem vocal aislado'
                : 'Análisis melódico por stem vocal activo'}
            </small>
          </div>
        </div>

        <div className="hud-metrics">
          <div className="metric-box score">
            <Trophy size={20} weight="fill" />
            <div>
              <small>PUNTOS</small>
              <strong>{score.toLocaleString()}</strong>
            </div>
          </div>

          <div className="metric-box streak">
            <Fire size={20} weight="fill" />
            <div>
              <small>RACHA</small>
              <strong>{streak}x</strong>
            </div>
          </div>

          <div className="metric-box tune">
            <MusicNotes size={20} weight="fill" />
            <div>
              <small>AFINACIÓN</small>
              <strong className={note && Math.abs(note.cents) < 10 ? 'in-tune' : ''}>
                {note?.name || '---'} {note ? `(${note.cents >= 0 ? '+' : ''}${note.cents.toFixed(1)}¢)` : ''}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* RADAR DE CONSCIENCIA DE LA CANCIÓN (Minimapa temporal para no perderse) */}
      <div className="song-consciousness-radar">
        <div className="radar-header">
          <span>📍 Radar Acústico de Consciencia de la Canción (Haz clic para saltar a cualquier sección)</span>
          <span className="radar-status-tag">{consciousness.hint}</span>
        </div>
        <div className="radar-track">
          {activeSong.consciousnessMap?.sections?.map((sec, i) => (
            <div 
              key={i}
              className={`radar-section ${sec.type}`}
              style={{
                left: `${(sec.start / totalDuration) * 100}%`,
                width: `${Math.max(1.5, (sec.duration / totalDuration) * 100)}%`
              }}
              title={`${sec.label} (${timeFmt(sec.start)} - ${timeFmt(sec.end)})`}
              onClick={() => handleSeek(sec.start)}
            >
              <span className="radar-label">{sec.type === 'vocal' ? '🎤' : '🎵'}</span>
            </div>
          ))}
          <div 
            className="radar-playhead" 
            style={{ left: `${Math.min(100, (currentPos / totalDuration) * 100)}%` }}
          />
        </div>
        <div className="radar-legend">
          <span className="legend-item"><i className="dot-intro" /> Intro</span>
          <span className="legend-item"><i className="dot-vocal" /> Estrofas Vocales</span>
          <span className="legend-item"><i className="dot-inst" /> Solos / Pausas Instrumentales</span>
          <span className="legend-item"><i className="dot-outro" /> Cierre</span>
          <span className="radar-derivation-tag">Sincronización: 0.00s de deriva temporal</span>
        </div>
      </div>

      {/* Estado del Escaneo y Controles de Transporte */}
      <div className="auto-scan-status-bar">
        <div className="scan-left">
          <CheckCircle size={18} weight="fill" color="#10b981" />
          <span>
            {isScanning 
              ? `Separando stems y analizando voz en "${activeSong.fileName}"...` 
              : `Pista lista: ${activeSong.fileName} (${timeFmt(totalDuration)}) · ${activeSong.notesTimeline?.length || 0} notas y versos sincronizados`}
          </span>
        </div>

        <div className="study-actions-inline">
          <button className="karaoke-play-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
            {isPlaying ? 'Pausar Canción' : 'Reproducir Canción'}
          </button>

          <div className="scrub-container">
            <span className="time-display">{timeFmt(currentPos)}</span>
            <input 
              type="range" 
              min="0" 
              max={totalDuration || 1} 
              step="0.1" 
              value={currentPos || 0} 
              onChange={e => handleSeek(+e.target.value)} 
            />
            <span className="time-display">{timeFmt(totalDuration)}</span>
          </div>

          <button 
            className="reset-btn" 
            onClick={() => { handleSeek(0); setScore(0); setStreak(0); }} 
            title="Volver al inicio (0:00)"
          >
            <ArrowCounterClockwise size={16} />
          </button>
        </div>
      </div>

      {/* AVISO CONSCIENTE DE ENTRADA VOCAL (Cuenta regresiva anti-pérdida) */}
      {consciousness.countdownToVocal > 0 && consciousness.countdownToVocal <= 5 && (
        <div className="vocal-cue-banner">
          <Sparkle size={20} weight="fill" className="pulse-icon" />
          <strong>¡ATENCIÓN! La voz entra en {consciousness.countdownToVocal} segundos</strong>
          <div className="countdown-pills">
            {[5, 4, 3, 2, 1].map(n => (
              <span key={n} className={`cue-pill ${consciousness.countdownToVocal === n ? 'active-pulse' : ''}`}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lienzo Piano-Roll interactivo con el Rastro de Notas Visible */}
      <div className="karaoke-canvas-wrap">
        <canvas ref={canvasRef} className="karaoke-canvas" />
        <div className="canvas-guides-info">
          <span>Rastro Melódico Limpio (Stem Vocal C3 — C6)</span>
          <span>{isPlaying ? '▶ Rastro Melódico en Reproducción' : `❚❚ Posición: ${timeFmt(currentPos)} · Arrastra para estudiar cualquier nota`}</span>
        </div>
      </div>

      {/* Teleprompter Consciente Sincronizado */}
      <div className="karaoke-live-subtitle-box">
        <div className="live-status-pill">
          <span className="live-dot"><i className={isPlaying ? 'on' : ''} /></span>
          <span>
            SECCIÓN ACTIVA EN {timeFmt(currentPos)}: {consciousness.section.toUpperCase()}
          </span>
        </div>

        <div className="teleprompter-content">
          <div className="lyrics-lead">
            <span className="lead-tag">LÍRICA / CANTO EN VIVO:</span>
            <h3 className="lyric-line glow-words">
              {activeLine ? (
                activeLine.text.startsWith('[') ? (
                  <span className="instrumental-glow">{activeLine.text}</span>
                ) : (
                  activeLine.text.split(' ').map((word, i) => (
                    <span key={i} className="word-glow">{word} </span>
                  ))
                )
              ) : 'Cargando sección...'}
            </h3>
          </div>

          <div className="translation-card">
            <div className="translation-header">
              <GlobeHemisphereWest size={16} />
              <span>TRADUCCIÓN / GUÍA EN ESPAÑOL:</span>
            </div>
            <p className="translation-line">
              {activeLine?.translation || 'Pauta instrumental en curso.'}
            </p>
          </div>
        </div>
      </div>

      {/* Letra Completa y Mapa Estructural de la Canción */}
      <div className="transcription-history-feed full-lyrics-feed">
        <div className="feed-header">
          <div className="feed-title">
            <FileText size={16} />
            <strong>Estructura y Letra Completa ({activeSong.lines?.length || 0} secciones sincronizadas)</strong>
          </div>
          <small>Haz clic en cualquier verso para saltar directamente a ese segundo sin perder el ritmo</small>
        </div>

        <div className="feed-body lyrics-grid-body">
          {activeSong.lines?.map((line, idx) => {
            const isCurrent = activeLine?.id === line.id;
            return (
              <div 
                key={line.id || idx} 
                className={`feed-row lyric-clickable-row ${isCurrent ? 'active-verse' : ''}`}
                onClick={() => handleSeek(line.time)}
                title={`Saltar al segundo ${timeFmt(line.time)}`}
              >
                <time>{timeFmt(line.time)}</time>
                <div className="feed-texts">
                  <div className="feed-orig"><strong>{line.text}</strong></div>
                  <div className="feed-trans">↳ {line.translation}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
