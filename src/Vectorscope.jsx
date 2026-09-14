import React, { useEffect, useRef } from 'react';

export function Vectorscope({ engine, tick }) {
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
    const inkColor = css.getPropertyValue('--plot-label').trim() || '#2c3e50';

    ctx.clearRect(0, 0, w, h);

    const halfW = w / 2;
    const circleW = Math.min(w * 0.42, h * 0.8);
    const circleX = halfW / 2;
    const circleY = h / 2;
    const radius = circleW / 2.2;

    // Left Circle (Phase polar)
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(circleX - radius, circleY);
    ctx.lineTo(circleX + radius, circleY);
    ctx.moveTo(circleX, circleY - radius);
    ctx.lineTo(circleX, circleY + radius);
    ctx.stroke();

    ctx.font = '9px system-ui';
    ctx.fillStyle = inkColor;
    ctx.textAlign = 'left'; ctx.fillText('L', circleX - radius + 2, circleY - radius + 10);
    ctx.textAlign = 'right'; ctx.fillText('R', circleX + radius - 2, circleY - radius + 10);
    ctx.textAlign = 'left'; ctx.fillText('Mono', circleX - radius, circleY + radius + 10);
    ctx.textAlign = 'right'; ctx.fillText('+1', circleX + radius, circleY + radius + 10);

    // Right Square (Vectorscope scatter plot)
    const scopeSize = Math.min(w * 0.45, h * 0.82);
    const scopeX = halfW + (w * 0.5 - scopeSize) / 2;
    const scopeY = (h - scopeSize) / 2;

    ctx.strokeStyle = gridColor;
    ctx.strokeRect(scopeX, scopeY, scopeSize, scopeSize);

    ctx.beginPath();
    ctx.moveTo(scopeX, scopeY + scopeSize / 2);
    ctx.lineTo(scopeX + scopeSize, scopeY + scopeSize / 2);
    ctx.moveTo(scopeX + scopeSize / 2, scopeY);
    ctx.lineTo(scopeX + scopeSize / 2, scopeY + scopeSize);
    ctx.stroke();

    ctx.fillStyle = inkColor;
    ctx.textAlign = 'center';
    ctx.fillText('Vectorscope', scopeX + scopeSize / 2, scopeY - 4);

    if (engine.left && engine.right && engine.active) {
      // Draw Phase line on circle
      ctx.strokeStyle = '#348aff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 512; i += 2) {
        const l = engine.left[i] || 0;
        const r = engine.right[i] || 0;
        const x = circleX + (l - r) * radius * 0.8;
        const y = circleY - (l + r) * radius * 0.8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Scatter dots on scope
      ctx.fillStyle = '#2b7fff99';
      for (let i = 0; i < 512; i += 4) {
        const l = engine.left[i] || 0;
        const r = engine.right[i] || 0;
        const sx = scopeX + scopeSize / 2 + (l - r) * (scopeSize * 0.4);
        const sy = scopeY + scopeSize / 2 - (l + r) * (scopeSize * 0.4);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
    }
  }, [engine, tick]);

  return <canvas ref={canvasRef} className="vectorscope-canvas" style={{ width: '100%', height: '110px' }} />;
}
