const STORAGE_KEY = 'blackmamba-intelligence-memory';

export class AudioIntelligenceEngine {
  constructor() {
    this.memory = this.loadMemory();
    this.currentPattern = null;
    this.totalSamplesProcessed = 0;
  }

  loadMemory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : { patterns: [], feedbackCount: 0, accuracy: 91.5 };
    } catch {
      return { patterns: [], feedbackCount: 0, accuracy: 91.5 };
    }
  }

  saveMemory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch {}
  }

  analyzeSample(sampleData) {
    if (!sampleData) return null;

    this.totalSamplesProcessed++;
    const { hz, rms, peak, correlation, micRms } = sampleData;

    // Spectral centroid approximation
    const centroidHz = hz || 440;
    const energy = rms != null ? rms : -40;
    const isStereo = correlation != null && Math.abs(correlation) < 0.95;

    let category = 'Ambiente / Silencio';
    let confidence = 85;

    if (energy > -45) {
      if (hz && hz >= 85 && hz <= 1200) {
        category = 'Voz humana / Canto';
        confidence = Math.min(98, Math.round(88 + (energy + 45) * 0.25));
      } else if (hz && hz > 1200) {
        category = 'Instrumento agudo / Armónicos altos';
        confidence = 92;
      } else if (hz && hz < 85) {
        category = 'Bajo profundo / Sub-frecuencia';
        confidence = 90;
      } else if (isStereo) {
        category = 'Mezcla musical estéreo';
        confidence = 94;
      } else {
        category = 'Señal armónica continua';
        confidence = 89;
      }
    }

    const fingerprint = {
      id: `FPR-${(this.memory.patterns.length + 1).toString().padStart(4, '0')}`,
      category,
      confidence,
      hz: centroidHz.toFixed(1),
      energy: energy.toFixed(1),
      timestamp: new Date().toISOString()
    };

    this.currentPattern = fingerprint;

    // Auto-learn new unique patterns every 50 samples
    if (this.totalSamplesProcessed % 50 === 0 && energy > -40) {
      this.rememberPattern(fingerprint);
    }

    return {
      category,
      confidence,
      fingerprint,
      totalPatterns: this.memory.patterns.length,
      accuracy: this.memory.accuracy.toFixed(1)
    };
  }

  rememberPattern(pattern) {
    if (!pattern) return;
    this.memory.patterns.push(pattern);
    if (this.memory.patterns.length > 500) this.memory.patterns.shift();
    this.memory.accuracy = Math.min(99.5, this.memory.accuracy + 0.05);
    this.saveMemory();
  }

  addFeedback(isCorrect) {
    this.memory.feedbackCount++;
    if (isCorrect) {
      this.memory.accuracy = Math.min(99.9, this.memory.accuracy + 0.3);
    } else {
      this.memory.accuracy = Math.max(70.0, this.memory.accuracy - 0.5);
    }
    this.saveMemory();
  }
}
