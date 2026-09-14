import React, { useState } from 'react';

const scales = {
  'A Major': ['A', 'B', 'C♯', 'D', 'E', 'F♯', 'G♯'],
  'C Major': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'G Major': ['G', 'A', 'B', 'C', 'D', 'E', 'F♯'],
  'D Major': ['D', 'E', 'F♯', 'G', 'A', 'B', 'C♯'],
  'A Minor': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  'E Minor': ['E', 'F♯', 'G', 'A', 'B', 'C', 'D'],
  'Chromatic': ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
};

export function MusicalScalePanel({ note }) {
  const [selectedScale, setSelectedScale] = useState('A Major');
  const scaleNotes = scales[selectedScale] || scales['A Major'];
  
  const currentNoteName = note?.name ? note.name.replace(/[0-9-]/g, '') : 'A';
  const confidence = note ? Math.min(99, Math.max(70, Math.round(95 - Math.abs(note.cents)))) : 92;

  return (
    <div className="musical-scale-panel">
      <div className="scale-header">
        <select 
          aria-label="Escala musical" 
          value={selectedScale} 
          onChange={e => setSelectedScale(e.target.value)}
          className="scale-select"
        >
          {Object.keys(scales).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="scale-degrees">
        {scaleNotes.map(n => {
          const isMatch = n === currentNoteName;
          return (
            <span key={n} className={`scale-pill ${isMatch ? 'active' : ''}`}>
              {n}
            </span>
          );
        })}
      </div>

      <div className="scale-footer">
        <div>
          <span>Detected: <strong>{note?.name || 'A4'} (I)</strong></span>
        </div>
        <div>
          <span>Key Confidence: <strong>{confidence}%</strong></span>
        </div>
      </div>
    </div>
  );
}
