import React, { useEffect, useRef } from 'react';

export function SinusoidalComponents({ hz = 440, tick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    const ratio = Math.min(devicePixelRatio, 2);
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    const css = getComputedStyle(document.documentElement);
    const gridColor = css.getPropertyValue('--grid').trim() || '#348aff22';
    ctx.clearRect(0, 0, w, h);

    // Draw baseline
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    const baseHz = hz || 440;
    const harmonics = [
      { mult: 1, color: '#e74c3c' }, // 1x Red
      { mult: 2, color: '#e67e22' }, // 2x Orange
      { mult: 3, color: '#2ecc71' }, // 3x Green
      { mult: 4, color: '#3498db' }, // 4x Cyan
      { mult: 5, color: '#9b59b6' }, // 5x Purple
    ];

    const phaseShift = (tick * 0.1) % (Math.PI * 2);

    harmonics.forEach(({ mult, color }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const t = (x / w) * Math.PI * 4 * mult + phaseShift * mult;
        const amp = (h * 0.35) / (mult ** 0.5);
        const y = h / 2 + Math.sin(t) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }, [hz, tick]);

  const baseHz = hz || 440;
  const legend = [
    { label: `1x (${Math.round(baseHz)} Hz)`, color: '#e74c3c' },
    { label: `2x (${Math.round(baseHz * 2)} Hz)`, color: '#e67e22' },
    { label: `3x (${(baseHz * 3 / 1000).toFixed(2)} kHz)`, color: '#2ecc71' },
    { label: `4x (${(baseHz * 4 / 1000).toFixed(2)} kHz)`, color: '#3498db' },
    { label: `5x (${(baseHz * 5 / 1000).toFixed(2)} kHz)`, color: '#9b59b6' },
  ];

  return (
    <div className="sinusoidal-container">
      <canvas ref={canvasRef} style={{ width: '100%', height: '80px' }} />
      <div className="sinusoidal-legend">
        {legend.map((item, idx) => (
          <span key={idx} style={{ color: item.color, fontSize: '10px', marginRight: '8px' }}>
            ■ {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
