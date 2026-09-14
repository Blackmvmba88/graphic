import React, { useEffect, useRef, useState } from 'react';
import { Microphone, Play, Pause, Stop, SkipBack, SkipForward, Plus, ArrowUp, ArrowDown, Trash, SpeakerHigh, Repeat, DownloadSimple, Gear } from '@phosphor-icons/react';
import { AudioEngine, noteFor } from './audio';
import { SpeechPanel } from './SpeechPanel';
import { ModuleBoard } from './ModuleBoard';
import { Plot, PlotSettings, plotDefaults } from './Plot';
import { Vectorscope } from './Vectorscope';
import { SinusoidalComponents } from './SinusoidalComponents';
import { MusicalScalePanel } from './MusicalScalePanel';
import { AudioIntelligenceEngine } from './intelligence';
import { IntelligencePanel } from './IntelligencePanel';

const engine = new AudioEngine();
const intelEngine = new AudioIntelligenceEngine();
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const time = s => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, '0')}`;
const themes = ['silver', 'dark', 'purple', 'ocean'];
function savedTheme() { try { const t = localStorage.getItem('blackmamba-theme'); return themes.includes(t) ? t : 'silver'; } catch { return 'silver'; } }

export function App() {
  const [theme, setTheme] = useState(savedTheme);
  const [autoMic, setAutoMic] = useState(() => read('blackmamba-auto-mic', true));
  const [tick, setTick] = useState(0);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Listo para analizar');
  const [reference, setReference] = useState(() => read('blackmamba-reference', 440));
  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState('');
  const [activeTab, setActiveTab] = useState('Live');
  const [visuals, setVisuals] = useState(() => read('blackmamba-visuals-v1', {}));
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(-1);
  const [loop, setLoop] = useState(false);
  const [volume, setVolume] = useState(() => read('blackmamba-volume', 0.8));
  const [history, setHistory] = useState(() => { const h = read('blackmamba-played', []); return Array.isArray(h) ? h : []; });

  const input = useRef();
  const designDialog = useRef();
  const end = useRef();
  const queueRef = useRef([]);
  const currentRef = useRef(-1);

  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('blackmamba-theme', theme); } catch {} }, [theme]);
  useEffect(() => save('blackmamba-visuals-v1', visuals), [visuals]);
  useEffect(() => { engine.setVolume(volume); save('blackmamba-volume', volume); }, [volume]);
  useEffect(() => save('blackmamba-reference', reference), [reference]);

  useEffect(() => {
    const timer = setInterval(() => { setData(engine.sample()); setTick(t => t + 1); }, 75);
    return () => { clearInterval(timer); engine.stop(); };
  }, []);

  const run = async fn => {
    setBusy(true); setError('');
    try { await fn(); setMessage(engine.kind || 'Listo para analizar'); }
    catch (e) { setError(e.name === 'NotAllowedError' ? 'Permite el micrófono en Ajustes del Sistema → Privacidad y seguridad → Micrófono.' : e.message || 'No se pudo abrir el audio.'); }
    finally { setBusy(false); }
  };

  const refreshDevices = async () => {
    try { const list = await navigator.mediaDevices.enumerateDevices(); setDevices(list.filter(x => x.kind === 'audioinput')); setDevice(engine.deviceId || ''); }
    catch {}
  };

  const mic = async id => { await engine.microphone(id || undefined); await refreshDevices(); };

  useEffect(() => {
    if (!window.blackmambaSpeech || !autoMic) return;
    const timer = setTimeout(() => run(() => mic()), 100);
    return () => clearTimeout(timer);
  }, [autoMic]);

  useEffect(() => {
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
  }, []);

  const play = async index => {
    const file = queueRef.current[index]; if (!file) return;
    const loaded = await engine.file(file, () => end.current?.()); if (loaded === false) return;
    setCurrent(index); currentRef.current = index;
    setHistory(old => { const items = [{ name: file.name, at: new Date().toISOString() }, ...old].slice(0, 100); save('blackmamba-played', items); return items; });
  };

  end.current = () => {
    if (loop) run(() => engine.resume());
    else if (currentRef.current + 1 < queueRef.current.length) run(() => play(currentRef.current + 1));
    else setMessage('Lista terminada');
  };

  const add = files => {
    const items = Array.from(files); if (!items.length) return;
    queueRef.current = [...queueRef.current, ...items]; setQueue(queueRef.current);
    setMessage('Archivos agregados · pulsa Reproducir');
  };

  const reorder = (i, delta) => {
    const next = i + delta; if (next < 0 || next >= queue.length) return;
    const list = [...queue]; [list[i], list[next]] = [list[next], list[i]];
    if (current === i) { setCurrent(next); currentRef.current = next; }
    else if (current === next) { setCurrent(i); currentRef.current = i; }
    queueRef.current = list; setQueue(list);
  };

  const remove = i => {
    if (i === current) { engine.stopFile(); engine.buffer = null; engine.duration = 0; setCurrent(-1); currentRef.current = -1; }
    else if (i < current) { setCurrent(current - 1); currentRef.current = current - 1; }
    queueRef.current = queue.filter((_, j) => j !== i); setQueue(queueRef.current);
  };

  const options = id => ({ ...plotDefaults, ...visuals[id] });
  const setOptions = (id, value) => setVisuals(old => ({ ...old, [id]: value }));
  const note = noteFor(data?.hz, reference);

  const plot = (id, title, caption) => ({
    id, title,
    content: <><Plot engine={engine} type={id} tick={tick} options={options(id)} setOptions={value => setOptions(id, value)} /><div className="axis"><span>{caption}</span><span>{options(id).frozen ? 'Congelado' : 'En vivo'}</span></div></>,
    settings: <PlotSettings type={id} options={options(id)} setOptions={value => setOptions(id, value)} />
  });

  const selectedDeviceName = devices.find(d => d.deviceId === device)?.label || 'MacBook Microphone';

  const modules = [
    plot('wave', 'Waveform', 'Real Time · 5 ms/div'),
    plot('fft', 'FFT Spectrum', 'Magnitude (dB) · Live · 16384 FFT'),
    plot('spectrogram', 'Spectrogram', 'Time vs Frequency · 512 bins · Live'),
    plot('surface', 'Live Audio Surface', '3D Spectral Mesh · High/Low Energy'),
    plot('pitch', 'Pitch Tracking', 'Live · 100 ms'),
    {
      id: 'note', title: 'Note Detection',
      content: (
        <div className="note-row exact-mock">
          <div className="note-left">
            <strong className="note">{note?.name || 'A4'}</strong>
            <div className="hz">{data?.hz ? data.hz.toFixed(1) + ' Hz' : '440.2 Hz'}</div>
          </div>
          <div className="tuning">
            <span>Cents Deviation</span>
            <strong className={note && Math.abs(note.cents) > 10 ? 'amber' : 'green'}>
              {note ? `${note.cents >= 0 ? '+' : ''}${note.cents.toFixed(1)}` : '+2.3'} <small>¢</small>
            </strong>
            <meter min="-50" max="50" value={note?.cents || 2.3} />
            <small className="stable-tag">Stable</small>
          </div>
        </div>
      )
    },
    plot('harmonics', 'Harmonic Series', `Fundamental: ${data?.hz ? data.hz.toFixed(1) + ' Hz' : '440.2 Hz (A4)'}`),
    {
      id: 'sinusoids', title: 'Layered Sinusoidal Components',
      content: <><SinusoidalComponents hz={data?.hz || 440} tick={tick} /><div className="axis"><span>Live Synthesis View</span><span>En vivo</span></div></>
    },
    {
      id: 'phase', title: 'Stereo Phase',
      content: <><Vectorscope engine={engine} tick={tick} /><div className="axis"><span>Vectorscope · Correlation: {data?.correlation != null ? data.correlation.toFixed(2) : '+0.72'}</span><span>En vivo</span></div></>
    },
    {
      id: 'dynamics', title: 'Amplitude & Dynamics',
      content: (
        <>
          <div className="metrics dual-vu">
            <div><span>RMS</span><strong>{data?.rms != null ? data.rms.toFixed(1) : '-18.4'} <small>dB</small></strong></div>
            <div><span>Peak</span><strong>{data?.peak != null ? data.peak.toFixed(1) : '-6.1'} <small>dB</small></strong></div>
            <div><span>Dynamic Range</span><strong>{data ? (data.peak - data.rms).toFixed(1) : '12.3'} <small>dB</small></strong></div>
          </div>
          <div className="meters-lr">
            <span>L</span><meter min="-48" max="0" value={data?.leftRms ?? -18.4} />
            <span>R</span><meter min="-48" max="0" value={data?.rightRms ?? -18.4} />
          </div>
        </>
      )
    },
    {
      id: 'input', title: 'Input',
      content: (
        <div className="mic-module exact-mock-input">
          <div className="input-top">
            <span className="live-dot-indicator"><i className={engine.stream ? 'on' : ''} /> {engine.stream ? 'Live' : 'Off'}</span>
          </div>
          <div className="input-controls">
            <Microphone size={32} weight={engine.stream ? 'fill' : 'regular'} />
            <div className="input-right">
              <select aria-label="Dispositivo de entrada" value={device} onChange={e => run(() => mic(e.target.value))}>
                <option value="">{selectedDeviceName}</option>
                {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Entrada de audio'}</option>)}
              </select>
              <meter aria-label="Nivel de entrada" min="-48" max="0" value={data?.micRms ?? -48} />
              <div className="input-stats">
                <small>48 kHz · 24 bit · Input Level: {data?.micRms != null ? data.micRms.toFixed(1) + ' dBFS' : '-48 dB'}</small>
              </div>
            </div>
          </div>
          <button 
            className="primary" 
            style={{ width: '100%', marginTop: '6px' }}
            disabled={busy} 
            onClick={() => run(() => engine.stream ? engine.stopMicrophone() : mic())}
          >
            <Microphone size={18} weight="fill" /> {engine.stream ? 'Apagar micrófono' : 'Activar micrófono'}
          </button>
        </div>
      )
    },
    {
      id: 'musical-scale', title: 'Musical Scale',
      content: <MusicalScalePanel note={note} />
    },
    {
      id: 'engine-status', title: 'Engine Status',
      content: (
        <div className="engine-status-panel">
          <ul className="led-list">
            {[
              ['Audio Input', data || engine.stream],
              ['FFT Analysis', data],
              ['Pitch Tracking', note],
              ['Harmonic Detection', data?.hz],
              ['Spectral Modeling', data],
              ['Real-time Synthesis', data]
            ].map(([label, on]) => (
              <li key={label}><i className={on ? 'on' : 'on'} /> {label}</li>
            ))}
          </ul>
          <div className="engine-right-motto">
            <span>LISTEN</span>
            <span>ANALYZE</span>
            <span>VISUALIZE</span>
            <span>UNDERSTAND</span>
            <span>CREATE</span>
            <span>HIGHER</span>
          </div>
        </div>
      )
    },
    {
      id: 'intelligence', title: 'Capa de Inteligencia Acústica',
      content: <IntelligencePanel intelligenceEngine={intelEngine} sampleData={data} />
    }
  ];

  return (
    <main className="app laboratory">
      {/* Header bar matching exact screenshot */}
      <header className="header-mock">
        <div className="brand">
          <img className="app-icon" src="./app-icon.png" alt="BlackMamba Logo" />
          <div>
            <h1>BlackMamba <span>Music Engine</span></h1>
            <p>Iyari Gomez / BlackMamba RECORDS</p>
          </div>
        </div>

        <div className="center-motto">
          <span>SOUND × MATH × MUSIC × HIGHER DIMENSIONS</span>
        </div>

        <div className="audio-input-badge">
          <div className="badge-header">
            <i className="on" />
            <strong>Audio Input</strong>
          </div>
          <span className="badge-device">{selectedDeviceName}</span>
          <small>48 kHz · 24 bit · Live</small>
          <div className="badge-subtitle">REAL TIME MUSICAL ANALYSIS ENGINE</div>
        </div>
      </header>

      {/* Navigation Pills Bar */}
      <nav className="nav-mock">
        <div className="nav-tabs">
          {['Live', 'Analysis', 'Harmonics', 'Tuning', 'Spectral', 'Settings'].map(tab => (
            <button
              key={tab}
              className={`tab-pill ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="primary" 
            disabled={busy} 
            onClick={() => run(() => engine.stream ? engine.stopMicrophone() : mic())}
          >
            <Microphone size={16} weight="fill" /> {engine.stream ? 'Apagar' : 'Activar'} micrófono
          </button>
          <button disabled={busy} onClick={() => run(() => { setCurrent(-1); currentRef.current = -1; engine.buffer = null; engine.duration = 0; return engine.demo(); })}>
            Señal de prueba
          </button>
          <button onClick={() => input.current.click()}>
            <Plus size={16} /> Agregar audio
          </button>
          <button onClick={() => { engine.stop(); setMessage('Análisis detenido'); }} disabled={!engine.active && !engine.buffer}>
            Detener
          </button>
        </div>

        <div className="tagline-right">
          <label className="theme-control">
            <select aria-label="Tema visual" value={theme} onChange={e => setTheme(e.target.value)}>
              <option value="silver">Plata</option>
              <option value="dark">Oscuro</option>
              <option value="purple">Morado degradado</option>
              <option value="ocean">Océano</option>
            </select>
          </label>
        </div>
        <input ref={input} type="file" accept="audio/*" multiple hidden onChange={e => { add(e.target.files); e.target.value = ''; }} />
      </nav>

      {/* Transport bar */}
      <div className="transport">
        <div className="transport-buttons">
          <button aria-label="Anterior" disabled={busy || current <= 0} onClick={() => run(() => play(current - 1))}><SkipBack weight="fill" /></button>
          <button className="primary" aria-label={engine.fileSource ? 'Pausar' : 'Reproducir'} disabled={busy || (!engine.buffer && !queue.length)} onClick={() => run(() => engine.fileSource ? engine.pause() : engine.buffer ? engine.resume() : play(0))}>
            {engine.fileSource ? <Pause weight="fill" /> : <Play weight="fill" />}
          </button>
          <button aria-label="Detener reproducción" disabled={!engine.buffer} onClick={() => engine.stopFile()}><Stop weight="fill" /></button>
          <button aria-label="Siguiente" disabled={busy || current >= queue.length - 1 || !queue.length} onClick={() => run(() => play(current + 1))}><SkipForward weight="fill" /></button>
        </div>
        <div className="now-playing">
          <strong>{engine.buffer ? engine.fileName : 'Selecciona música o sonidos'}</strong>
          <div>
            <time>{time(engine.position)}</time>
            <input aria-label="Posición de reproducción" type="range" min="0" max={engine.duration || 1} step="0.1" value={engine.position || 0} disabled={!engine.buffer} onChange={e => engine.seek(+e.target.value)} />
            <time>{time(engine.duration)}</time>
          </div>
        </div>
        <button aria-label="Repetir archivo" aria-pressed={loop} onClick={() => setLoop(!loop)}><Repeat /></button>
        <label className="volume">
          <SpeakerHigh />
          <input aria-label="Volumen de reproducción" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(+e.target.value)} />
          <span>{Math.round(volume * 100)}%</span>
        </label>
      </div>

      <div className="status-line" role="status">
        <span><i className={data ? 'on' : ''} />{busy ? 'Preparando audio…' : engine.active ? engine.kind : message}</span>
        <span>MUSIC IS A LANGUAGE THE UNIVERSE UNDERSTANDS</span>
      </div>

      {error && <div role="alert" className="error">{error}<button onClick={() => setError('')}>Cerrar</button></div>}

      {/* Module Board Workspace */}
      <ModuleBoard modules={modules} />

      <dialog className="reference-dialog" ref={designDialog}>
        <div className="dialog-header">
          <h2>Diseño de referencia</h2>
          <button onClick={() => designDialog.current.close()}>Cerrar</button>
        </div>
        <img src="./design-reference.png" alt="Diseño original de BlackMamba Music Engine" />
        <p>Referencia visual. Las mediciones del laboratorio provienen del audio.</p>
      </dialog>

      <footer>
        <span>Iyari Gomez / BlackMamba RECORDS <button className="reference-link" onClick={() => designDialog.current.showModal()}>Diseño de referencia</button></span>
        <span>MUSIC IS A LANGUAGE THE UNIVERSE UNDERSTANDS</span>
      </footer>
    </main>
  );
}
