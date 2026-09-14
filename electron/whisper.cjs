const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const os = require('node:os');

class WhisperService {
  constructor(directory) {
    this.directory = directory;
    this.child = null;
    this.generation = 0;
    this.busy = false;
    this.usbDir = '/Volumes/ADATA SC740/blackmamba_offloads/models';
  }

  resolveActiveModel() {
    const candidates = [
      // 1. Modelos en memoria USB ADATA SC740 (prioridad para no ocupar disco)
      { name: 'Whisper Large v3 Turbo · USB', path: path.join(this.usbDir, 'ggml-large-v3-turbo.bin'), isUsb: true },
      { name: 'Whisper Medium · USB', path: path.join(this.usbDir, 'ggml-medium.bin'), isUsb: true },
      { name: 'Whisper Base · USB', path: path.join(this.usbDir, 'ggml-base.bin'), isUsb: true },
      // 2. Fallback a directorio local
      { name: 'Whisper Large v3 Turbo · Local', path: path.join(this.directory, 'ggml-large-v3-turbo.bin'), isUsb: false },
      { name: 'Whisper Base · Local', path: path.join(this.directory, 'ggml-base.bin'), isUsb: false }
    ];

    for (const c of candidates) {
      if (fsSync.existsSync(c.path)) {
        return c;
      }
    }
    return null;
  }

  async status() {
    try {
      const cliPath = path.join(this.directory, 'whisper-cli');
      await fs.access(cliPath);
      const active = this.resolveActiveModel();
      if (!active) {
        return { available: false, model: 'Whisper no tiene modelos descargados' };
      }
      return {
        available: true,
        model: active.name,
        path: active.path,
        isUsb: active.isUsb,
        usbConnected: fsSync.existsSync(this.usbDir)
      };
    } catch {
      return { available: false, model: 'Whisper no está instalado en esta versión' };
    }
  }

  cancel() {
    this.generation++;
    this.child?.kill('SIGTERM');
  }

  async transcribe(bytes, language = 'es') {
    if (this.busy) throw new Error('Whisper está procesando otro fragmento.');
    const buffer = Buffer.from(bytes);
    if (
      buffer.length < 44 ||
      buffer.length > 16000 * 2 * 15 + 44 ||
      buffer.toString('ascii', 0, 4) !== 'RIFF' ||
      buffer.toString('ascii', 8, 12) !== 'WAVE' ||
      buffer.readUInt16LE(20) !== 1 ||
      buffer.readUInt16LE(22) !== 1 ||
      buffer.readUInt32LE(24) !== 16000 ||
      buffer.readUInt16LE(34) !== 16
    ) throw new Error('Fragmento WAV inválido.');

    if (!['es', 'en', 'auto'].includes(language)) throw new Error('Idioma no válido.');

    const active = this.resolveActiveModel();
    if (!active) throw new Error('No hay modelos de Whisper disponibles.');

    this.busy = true;
    const generation = this.generation;
    let dir;

    try {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), 'blackmamba-whisper-'));
      await fs.chmod(dir, 0o700);
      const wav = path.join(dir, 'audio.wav'), out = path.join(dir, 'result');
      await fs.writeFile(wav, buffer, { mode: 0o600 });

      await new Promise((resolve, reject) => {
        const child = spawn(
          path.join(this.directory, 'whisper-cli'),
          ['-m', active.path, '-f', wav, '-l', language, '-otxt', '-of', out, '-np', '-nt', '-t', '4', '-bo', '1', '-bs', '1', '-nf', '-sns'],
          { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }
        );
        this.child = child;
        let errors = '';
        const timer = setTimeout(() => child.kill('SIGTERM'), 90000);
        child.stderr.on('data', d => { errors = (errors + d).slice(-4000); });
        child.on('error', e => { clearTimeout(timer); reject(new Error('No se pudo iniciar Whisper local: ' + e.code)); });
        child.on('close', code => {
          clearTimeout(timer);
          this.child = null;
          if (generation !== this.generation) reject(new Error('Transcripción cancelada.'));
          else if (code !== 0) reject(new Error('Whisper no pudo procesar este fragmento.'));
          else resolve();
        });
      });

      return {
        text: (await fs.readFile(out + '.txt', 'utf8')).trim().replace(/\[_[^\]]+\]/g, '').trim(),
        model: active.name
      };
    } finally {
      this.busy = false;
      if (dir) await fs.rm(dir, { recursive: true, force: true });
    }
  }

  /**
   * Transcribe un stem vocal o pista completa de audio directamente usando Whisper
   * y devuelve los segmentos temporales exactos con milisegundos reales (JSON).
   */
  async transcribeSong(bytes, language = 'auto') {
    if (this.busy) throw new Error('Whisper está procesando otro audio.');
    const buffer = Buffer.from(bytes);
    if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
      throw new Error('Archivo WAV inválido para transcripción.');
    }

    const active = this.resolveActiveModel();
    if (!active) throw new Error('No hay modelos de Whisper disponibles.');

    this.busy = true;
    const generation = this.generation;
    let dir;

    try {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), 'blackmamba-song-whisper-'));
      await fs.chmod(dir, 0o700);
      const wav = path.join(dir, 'song.wav'), out = path.join(dir, 'result');
      await fs.writeFile(wav, buffer, { mode: 0o600 });

      await new Promise((resolve, reject) => {
        // Ejecutar whisper-cli con salida JSON (-oj) para marcas de tiempo exactas
        const child = spawn(
          path.join(this.directory, 'whisper-cli'),
          ['-m', active.path, '-f', wav, '-l', language, '-oj', '-of', out, '-np', '-t', '4', '-bo', '2', '-bs', '2'],
          { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }
        );
        this.child = child;
        let errors = '';
        const timer = setTimeout(() => child.kill('SIGTERM'), 180000);
        child.stderr.on('data', d => { errors = (errors + d).slice(-4000); });
        child.on('error', e => { clearTimeout(timer); reject(new Error('Fallo al iniciar Whisper: ' + e.code)); });
        child.on('close', code => {
          clearTimeout(timer);
          this.child = null;
          if (generation !== this.generation) reject(new Error('Transcripción cancelada.'));
          else if (code !== 0) reject(new Error('Whisper no pudo procesar la canción: ' + errors));
          else resolve();
        });
      });

      const jsonStr = await fs.readFile(out + '.json', 'utf8');
      const data = JSON.parse(jsonStr);

      const segments = (data.transcription || []).map((seg, idx) => {
        const fromMs = seg.offsets?.from ?? 0;
        const toMs = seg.offsets?.to ?? 0;
        return {
          id: `whisper_${idx}`,
          start: Math.round((fromMs / 1000) * 100) / 100,
          end: Math.round((toMs / 1000) * 100) / 100,
          duration: Math.round(((toMs - fromMs) / 1000) * 100) / 100,
          text: (seg.text || '').trim().replace(/\[_[^\]]+\]/g, '').trim()
        };
      }).filter(s => s.text.length > 0);

      return {
        modelUsed: active.name,
        isUsb: active.isUsb,
        language: data.result?.language || language,
        segments
      };
    } finally {
      this.busy = false;
      if (dir) await fs.rm(dir, { recursive: true, force: true });
    }
  }
}

module.exports = { WhisperService };
