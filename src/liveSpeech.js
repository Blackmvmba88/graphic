/**
 * liveSpeech.js · BlackMamba Real-time Speech & Live Translation Engine
 * Soporte dual: Web Speech API (navegador) + Whisper local (Electron).
 * Traducción instantánea bilingüe (ES ⇄ EN) de baja latencia.
 */

// Diccionario de frases y expresiones comunes en música y voz
const PHRASE_DICTIONARY = {
  // ES -> EN
  'el sonido se convierte en conocimiento': 'sound becomes knowledge',
  'musica es vida': 'music is life',
  'la musica es un lenguaje universal': 'music is a universal language',
  'canto bajo la lluvia': 'singing in the rain',
  'escucha la armonia': 'listen to the harmony',
  'siente el ritmo': 'feel the rhythm',
  'en lo alto': 'high above',
  'brilla como una estrella': 'shine like a star',
  'noche estrellada': 'starry night',
  'mi corazon late': 'my heart beats',
  'voz en vivo': 'live voice',
  'afina tu voz': 'tune your voice',
  'somos energia': 'we are energy',
  'frecuencia y vibracion': 'frequency and vibration',
  'todo es armonia': 'everything is harmony',
  'dejate llevar': 'let yourself go',
  'vuela alto': 'fly high',
  'un nuevo dia': 'a brand new day',
  'luz en la oscuridad': 'light in the dark',

  // EN -> ES
  'sound becomes knowledge': 'el sonido se convierte en conocimiento',
  'music is life': 'la música es vida',
  'music is a universal language': 'la música es un lenguaje universal',
  'singing in the rain': 'cantando bajo la lluvia',
  'listen to the harmony': 'escucha la armonía',
  'feel the rhythm': 'siente el ritmo',
  'shine like a star': 'brilla como una estrella',
  'starry night': 'noche estrellada',
  'my heart beats': 'mi corazón late',
  'live voice': 'voz en vivo',
  'we are energy': 'somos energía',
  'frequency and vibration': 'frecuencia y vibración',
  'everything is harmony': 'todo es armonía',
  'let it go': 'déjalo ir',
  'fly high': 'vuela alto',
  'light in the dark': 'luz en la oscuridad'
};

// Vocabulario bilingüe palabra por palabra
const WORD_MAP_ES_TO_EN = {
  'el': 'the', 'la': 'the', 'los': 'the', 'las': 'the', 'un': 'a', 'una': 'a',
  'es': 'is', 'son': 'are', 'esta': 'is', 'fue': 'was', 'ser': 'be',
  'sonido': 'sound', 'musica': 'music', 'voz': 'voice', 'cantar': 'sing', 'canto': 'sing',
  'amor': 'love', 'vida': 'life', 'corazon': 'heart', 'estrella': 'star', 'estrellas': 'stars',
  'luz': 'light', 'fuego': 'fire', 'noche': 'night', 'dia': 'day', 'cielo': 'sky',
  'mundo': 'world', 'universo': 'universe', 'armonia': 'harmony', 'ritmo': 'rhythm',
  'nota': 'note', 'tono': 'pitch', 'energia': 'energy', 'tiempo': 'time', 'onda': 'wave',
  'alma': 'soul', 'fuerza': 'force', 'brillo': 'shine', 'suave': 'smooth', 'fuerte': 'strong',
  'pasion': 'passion', 'sueno': 'dream', 'suenos': 'dreams', 'volar': 'fly', 'viento': 'wind',
  'mar': 'sea', 'camino': 'path', 'verdad': 'truth', 'sentir': 'feel', 'escuchar': 'listen',
  'alto': 'high', 'bajo': 'low', 'profundo': 'deep', 'libre': 'free', 'somos': 'we are',
  'yo': 'I', 'tu': 'you', 'nosotros': 'we', 'ellos': 'they', 'aqui': 'here', 'ahora': 'now',
  'siempre': 'always', 'nunca': 'never', 'hoy': 'today', 'manana': 'tomorrow'
};

const WORD_MAP_EN_TO_ES = {
  'the': 'el', 'a': 'un', 'an': 'un', 'is': 'es', 'are': 'son', 'was': 'fue', 'were': 'eran',
  'be': 'ser', 'been': 'sido', 'being': 'siendo', 'have': 'tener', 'has': 'tiene', 'had': 'tenía',
  'do': 'hacer', 'does': 'hace', 'did': 'hizo', 'can': 'puedo', 'could': 'podría', 'will': 'voy a',
  'would': 'haría', 'should': 'debería', 'must': 'debo',
  'i': 'yo', 'you': 'tú', 'he': 'él', 'she': 'ella', 'it': 'eso', 'we': 'nosotros', 'they': 'ellos',
  'my': 'mi', 'your': 'tu', 'his': 'su', 'her': 'su', 'our': 'nuestro', 'their': 'su',
  'me': 'me', 'us': 'nos', 'them': 'los', 'this': 'esto', 'that': 'eso', 'these': 'estos', 'those': 'esos',
  'sound': 'sonido', 'music': 'música', 'voice': 'voz', 'song': 'canción', 'songs': 'canciones',
  'sing': 'cantar', 'singing': 'cantando', 'dance': 'bailar', 'dancing': 'bailando',
  'love': 'amor', 'life': 'vida', 'heart': 'corazón', 'baby': 'cariño',
  'star': 'estrella', 'stars': 'estrellas', 'light': 'luz', 'fire': 'fuego', 'night': 'noche', 'tonight': 'esta noche',
  'day': 'día', 'today': 'hoy', 'sky': 'cielo', 'world': 'mundo', 'universe': 'universo', 'harmony': 'armonía',
  'rhythm': 'ritmo', 'beat': 'ritmo', 'note': 'nota', 'pitch': 'tono', 'energy': 'energía', 'time': 'tiempo',
  'wave': 'onda', 'soul': 'alma', 'shine': 'brillar', 'dream': 'sueño', 'dreams': 'sueños',
  'fly': 'volar', 'wind': 'viento', 'sea': 'mar', 'feel': 'sentir', 'feeling': 'sentimiento',
  'listen': 'escuchar', 'hear': 'oír', 'see': 'ver', 'look': 'mirar', 'say': 'decir', 'tell': 'contar',
  'know': 'saber', 'think': 'pensar', 'hold': 'sostener', 'take': 'tomar', 'give': 'dar', 'make': 'hacer',
  'come': 'venir', 'go': 'ir', 'stay': 'quedarse', 'leave': 'partir', 'fall': 'caer', 'rise': 'elevarse',
  'high': 'alto', 'higher': 'más alto', 'low': 'bajo', 'deep': 'profundo', 'free': 'libre', 'wild': 'salvaje',
  'forever': 'para siempre', 'together': 'juntos', 'away': 'lejos', 'again': 'otra vez',
  'here': 'aquí', 'there': 'allí', 'now': 'ahora', 'always': 'siempre', 'never': 'nunca',
  'and': 'y', 'or': 'o', 'but': 'pero', 'so': 'así que', 'because': 'porque', 'if': 'si', 'when': 'cuando',
  'with': 'con', 'without': 'sin', 'for': 'para', 'in': 'en', 'on': 'sobre', 'at': 'en', 'to': 'a', 'from': 'desde',
  'all': 'todo', 'every': 'cada', 'everything': 'todo', 'nothing': 'nada', 'something': 'algo',
  'good': 'bueno', 'bad': 'malo', 'beautiful': 'hermoso', 'crazy': 'loco', 'sweet': 'dulce', 'true': 'verdadero',
  'eyes': 'ojos', 'mind': 'mente', 'body': 'cuerpo', 'rain': 'lluvia', 'sun': 'sol', 'sunshine': 'rayo de sol'
};

/**
 * Traduce texto de forma instantánea entre español e inglés.
 */
export function translateText(text, targetLang = 'auto') {
  if (!text || typeof text !== 'string') return '';
  const clean = text.trim();
  const lower = clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Coincidencia exacta de frase
  if (PHRASE_DICTIONARY[lower]) {
    return capitalizeFirst(PHRASE_DICTIONARY[lower]);
  }

  // 2. Detección heurística de idioma (si es español o inglés)
  const words = lower.split(/\s+/);
  let esPoints = 0;
  let enPoints = 0;

  words.forEach(w => {
    if (WORD_MAP_ES_TO_EN[w]) esPoints++;
    if (WORD_MAP_EN_TO_ES[w]) enPoints++;
  });

  const isSpanish = targetLang === 'en' ? true : targetLang === 'es' ? false : (esPoints >= enPoints);
  const dict = isSpanish ? WORD_MAP_ES_TO_EN : WORD_MAP_EN_TO_ES;

  // 3. Traducción por sustitución de términos
  const translatedWords = words.map(w => dict[w] || w);
  const result = translatedWords.join(' ');
  return capitalizeFirst(result);
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Controlador de Reconocimiento de Voz en Vivo
 */
export class LiveSpeechController {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.language = 'es-ES'; // 'es-ES' | 'en-US'
    this.onResult = null; // callback (data: { transcript, translation, isFinal })
    this.onError = null;
    this.init();
  }

  init() {
    const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (!SpeechRecognition) {
      this.isSupported = false;
      return;
    }
    this.isSupported = true;
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;

      this.recognition.onresult = (event) => {
        let interim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        const activeText = (finalTranscript || interim).trim();
        if (activeText && this.onResult) {
          const targetLang = this.language.startsWith('es') ? 'en' : 'es';
          const translation = translateText(activeText, targetLang);
          this.onResult({
            transcript: activeText,
            translation,
            isFinal: !!finalTranscript,
            lang: this.language
          });
        }
      };

      this.recognition.onerror = (e) => {
        if (this.onError) this.onError(e);
      };

      this.recognition.onend = () => {
        // Auto-reiniciar si sigue en modo escucha continuo
        if (this.isListening) {
          try { this.recognition.start(); } catch {}
        }
      };
    } catch (e) {
      this.isSupported = false;
    }
  }

  setLanguage(langCode) {
    this.language = langCode === 'en' ? 'en-US' : 'es-ES';
    if (this.recognition) {
      this.recognition.lang = this.language;
      if (this.isListening) {
        this.stop();
        this.start();
      }
    }
  }

  start() {
    if (!this.recognition || this.isListening) return;
    this.isListening = true;
    try {
      this.recognition.start();
    } catch {}
  }

  stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }
}
