export function pitch(samples, rate) {
  const n = Math.min(samples.length, 2048); let power = 0;
  for(let i=0;i<n;i++) power += samples[i]*samples[i];
  if(Math.sqrt(power/n)<0.008) return null;
  const min=Math.floor(rate/1400), max=Math.min(Math.floor(rate/55),n-2), d=new Float32Array(max+1); let sum=0;
  for(let tau=1;tau<=max;tau++) { let v=0; for(let i=0;i<n-max;i++){const x=samples[i]-samples[i+tau];v+=x*x;} sum+=v;d[tau]=sum?v*tau/sum:1; }
  for(let t=min;t<max-1;t++) if(d[t]<0.14){while(t+1<max&&d[t+1]<d[t])t++; const a=d[t-1],b=d[t],c=d[t+1];const delta=(a-c)/(2*(a-2*b+c))||0;return rate/(t+delta);}
  return null;
}
export function noteFor(hz, reference=440){if(!hz)return null;const midi=Math.round(69+12*Math.log2(hz/reference));return {midi,name:['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][(midi%12+12)%12]+(Math.floor(midi/12)-1),cents:1200*Math.log2(hz/(reference*2**((midi-69)/12)))};}
export class AudioEngine {
 constructor(){this.active=false;this.history=[];this.pitchHistory=[];this.kind='';this.generation=0;}
 async init(){if(!this.ctx)this.ctx=new AudioContext();await this.ctx.resume();}
 stop(){this.generation++;this.active=false;this.source?.disconnect();try{this.source?.stop();}catch{}this.stream?.getTracks().forEach(t=>t.stop());this.source=null;this.stream=null;this.analyser?.disconnect();this.history=[];this.pitchHistory=[];}
 connect(source,audible){this.source=source;this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=8192;this.analyser.smoothingTimeConstant=.65;source.connect(this.analyser);if(audible)this.analyser.connect(this.ctx.destination);this.wave=new Float32Array(8192);this.freq=new Float32Array(4096);this.active=true;}
 async microphone(){this.stop();const token=this.generation;await this.init();const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});if(token!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}this.stream=stream;this.kind='Micrófono';this.connect(this.ctx.createMediaStreamSource(stream),false);}
 async file(file,onEnd){this.stop();const token=this.generation;await this.init();const buffer=await this.ctx.decodeAudioData(await file.arrayBuffer());if(token!==this.generation)return;const s=this.ctx.createBufferSource();s.buffer=buffer;this.kind=file.name;this.connect(s,true);s.onended=()=>{if(this.source===s){this.stop();onEnd();}};s.start();}
 async demo(){this.stop();await this.init();const s=this.ctx.createOscillator();s.frequency.value=440;this.kind='Prueba · seno 440 Hz';const g=this.ctx.createGain();g.gain.value=.25;s.connect(g);this.connect(g,false);this.source.stop=()=>s.stop();s.start();}
 sample(){if(!this.active)return null;this.analyser.getFloatTimeDomainData(this.wave);this.analyser.getFloatFrequencyData(this.freq);let sum=0,peak=0;for(const x of this.wave){sum+=x*x;peak=Math.max(peak,Math.abs(x));}const rms=20*Math.log10(Math.sqrt(sum/this.wave.length)||1e-8);const hz=pitch(this.wave,this.ctx.sampleRate);const bins=Array.from({length:72},(_,i)=>{const f=30*(Math.min(20000,this.ctx.sampleRate/2)/30)**(i/71);const next=30*(Math.min(20000,this.ctx.sampleRate/2)/30)**((i+1)/71); const lo=Math.max(0,Math.floor(f*8192/this.ctx.sampleRate)), hi=Math.min(4095,Math.ceil(next*8192/this.ctx.sampleRate)); let peak=-100; for(let k=lo;k<=hi;k++)peak=Math.max(peak,this.freq[k]); return peak;});this.history.push(bins);if(this.history.length>65)this.history.shift();this.pitchHistory.push(hz);if(this.pitchHistory.length>160)this.pitchHistory.shift();return {rms,peak:20*Math.log10(peak||1e-8),hz,rate:this.ctx.sampleRate};}
}
