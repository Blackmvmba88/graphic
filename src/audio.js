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
 constructor(){this.active=false;this.history=[];this.pitchHistory=[];this.kind='';this.micGeneration=0;this.fileGeneration=0;this.speechEnabled=true;this.onSpeech=null;}
 async init(){
  if(!this.ctx){this.ctx=new AudioContext();this.mix=this.ctx.createGain();this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=8192;this.analyser.smoothingTimeConstant=.65;this.mix.connect(this.analyser);this.wave=new Float32Array(8192);this.freq=new Float32Array(4096);}
  await this.ctx.resume();
  if(this.onSpeech&&!this.speechReady){if(!this.speechLoading)this.speechLoading=this.ctx.audioWorklet.addModule(new URL('./speech-worklet.js',document.baseURI).href);await this.speechLoading;this.speechReady=true;}
  if(this.speechReady&&!this.speechNode){this.speechNode=new AudioWorkletNode(this.ctx,'speech-capture');this.speechNode.port.onmessage=e=>this.onSpeech?.({...e.data,source:this.kind||'Audio'});if(!this.speechEnabled)this.speechNode.port.postMessage('disable');this.mix.connect(this.speechNode);this.speechNode.connect(this.ctx.destination);}
 }
 update(){this.active=!!(this.stream||this.fileSource||this.demoSource);this.kind=[this.stream?'Micrófono':'',this.fileSource?this.fileName:'',this.demoSource?'Prueba · seno 440 Hz':''].filter(Boolean).join(' + ');if(this.mix)this.mix.gain.setValueAtTime(this.stream&&this.fileSource?0.5:1,this.ctx.currentTime);}
 setSpeechEnabled(enabled){this.speechEnabled=enabled;this.speechNode?.port.postMessage(enabled?'enable':'disable');}
 stopMicrophone(){this.micGeneration++;this.micSource?.disconnect();this.stream?.getTracks().forEach(t=>t.stop());this.micSource=null;this.stream=null;this.update();if(!this.active)this.speechNode?.port.postMessage('flush');}
 stopFile(){this.fileGeneration++;const source=this.fileSource;this.fileSource=null;source?.disconnect();try{source?.stop();}catch{}this.fileName='';this.update();if(!this.active)this.speechNode?.port.postMessage('flush');}
 stopDemo(){this.demoSource?.disconnect();try{this.demoSource?.stop();}catch{}this.demoSource=null;this.demoGain?.disconnect();this.demoGain=null;this.update();}
 stop(){this.stopMicrophone();this.stopFile();this.stopDemo();this.speechNode?.port.postMessage('flush');this.history=[];this.pitchHistory=[];}
 async microphone(){
  if(this.stream)return;const token=++this.micGeneration;await this.init();
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  if(token!==this.micGeneration){stream.getTracks().forEach(t=>t.stop());return;}
  this.stream=stream;this.micSource=this.ctx.createMediaStreamSource(stream);this.micSource.connect(this.mix);this.update();
 }
 async file(file,onEnd){
  const token=++this.fileGeneration;await this.init();const buffer=await this.ctx.decodeAudioData(await file.arrayBuffer());if(token!==this.fileGeneration)return;
  const previous=this.fileSource;this.fileSource=null;previous?.disconnect();try{previous?.stop();}catch{}
  const source=this.ctx.createBufferSource();source.buffer=buffer;this.fileSource=source;this.fileName=file.name;source.connect(this.mix);source.connect(this.ctx.destination);
  source.onended=()=>{if(this.fileSource===source){this.fileSource=null;source.disconnect();this.update();if(!this.active)this.speechNode?.port.postMessage('flush');onEnd?.();}};source.start();this.update();
 }
 async demo(){this.stop();await this.init();const s=this.ctx.createOscillator(),g=this.ctx.createGain();s.frequency.value=440;g.gain.value=.25;s.connect(g);g.connect(this.mix);this.demoSource=s;this.demoGain=g;s.start();this.update();}
 sample(){if(!this.active)return null;this.analyser.getFloatTimeDomainData(this.wave);this.analyser.getFloatFrequencyData(this.freq);let sum=0,peak=0;for(const x of this.wave){sum+=x*x;peak=Math.max(peak,Math.abs(x));}const rms=20*Math.log10(Math.sqrt(sum/this.wave.length)||1e-8);const hz=pitch(this.wave,this.ctx.sampleRate);const bins=Array.from({length:72},(_,i)=>{const f=30*(Math.min(20000,this.ctx.sampleRate/2)/30)**(i/71);const next=30*(Math.min(20000,this.ctx.sampleRate/2)/30)**((i+1)/71);const lo=Math.max(0,Math.floor(f*8192/this.ctx.sampleRate)),hi=Math.min(4095,Math.ceil(next*8192/this.ctx.sampleRate));let peak=-100;for(let k=lo;k<=hi;k++)peak=Math.max(peak,this.freq[k]);return peak;});this.history.push(bins);if(this.history.length>65)this.history.shift();this.pitchHistory.push(hz);if(this.pitchHistory.length>160)this.pitchHistory.shift();return {rms,peak:20*Math.log10(peak||1e-8),hz,rate:this.ctx.sampleRate};}
}
