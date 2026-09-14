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
 constructor(){this.active=false;this.history=[];this.pitchHistory=[];this.kind='';this.micGeneration=0;this.fileGeneration=0;this.speechEnabled=true;this.onSpeech=null;this.offset=0;this.volume=0.8;this.duration=0;this.stemMode='mix';this.stems=null;}
 async init(){
  if(!this.ctx){this.ctx=new AudioContext();this.mix=this.ctx.createGain();this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=8192;this.analyser.smoothingTimeConstant=.65;this.mix.connect(this.analyser);this.wave=new Float32Array(8192);this.freq=new Float32Array(4096);}
  if(!this.output){this.output=this.ctx.createGain();this.output.gain.value=this.volume;this.output.connect(this.ctx.destination);}
  if(!this.splitter){this.splitter=this.ctx.createChannelSplitter(2);this.mix.connect(this.splitter);this.stereoAnalysers=[0,1].map(channel=>{const a=this.ctx.createAnalyser();a.fftSize=1024;this.splitter.connect(a,channel);return a});this.left=new Float32Array(1024);this.right=new Float32Array(1024);}
  await this.ctx.resume();
  if(this.onSpeech&&!this.speechReady){if(!this.speechLoading)this.speechLoading=this.ctx.audioWorklet.addModule(new URL('./speech-worklet.js',document.baseURI).href);await this.speechLoading;this.speechReady=true;}
  if(this.speechReady&&!this.speechNode){this.speechNode=new AudioWorkletNode(this.ctx,'speech-capture');this.speechNode.port.onmessage=e=>this.onSpeech?.({...e.data,source:this.kind||'Audio'});if(!this.speechEnabled)this.speechNode.port.postMessage('disable');this.mix.connect(this.speechNode);this.speechNode.connect(this.ctx.destination);}
 }
 update(){this.active=!!(this.stream||this.fileSource||this.demoSource);this.kind=[this.stream?'Micrófono':'',this.fileSource?this.fileName:'',this.demoSource?'Prueba · seno 440 Hz':''].filter(Boolean).join(' + ');if(this.mix)this.mix.gain.setValueAtTime(this.stream&&this.fileSource?0.5:1,this.ctx.currentTime);}
 setSpeechEnabled(enabled){this.speechEnabled=enabled;this.speechNode?.port.postMessage(enabled?'enable':'disable');}
 stopMicrophone(){this.micGeneration++;this.micSource?.disconnect();this.stream?.getTracks().forEach(t=>t.stop());this.micSource=null;this.stream=null;this.update();if(!this.active)this.speechNode?.port.postMessage('flush');}
 stopFile(){this.fileGeneration++;const source=this.fileSource;this.fileSource=null;source?.disconnect();try{source?.stop();}catch{}this.offset=0;this.update();if(!this.active)this.speechNode?.port.postMessage('flush');}
 stopDemo(){this.demoSource?.disconnect();try{this.demoSource?.stop();}catch{}this.demoSource=null;this.demoGain?.disconnect();this.demoGain=null;this.update();}
 stop(){this.stopMicrophone();this.stopFile();this.stopDemo();this.speechNode?.port.postMessage('flush');this.history=[];this.pitchHistory=[];}
 async microphone(deviceId){
  if(this.stream&&deviceId===undefined)return;const token=++this.micGeneration;await this.init();
  const stream=await navigator.mediaDevices.getUserMedia({audio:{...(deviceId?{deviceId:{exact:deviceId}}:{}),echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  if(token!==this.micGeneration){stream.getTracks().forEach(t=>t.stop());return;}
  this.micSource?.disconnect();this.stream?.getTracks().forEach(t=>t.stop());this.stream=stream;this.deviceId=stream.getAudioTracks?.()[0]?.getSettings().deviceId||deviceId||'';this.micSource=this.ctx.createMediaStreamSource(stream);this.micSource.connect(this.mix);if(!this.micAnalyser){this.micAnalyser=this.ctx.createAnalyser();this.micAnalyser.fftSize=1024;this.micWave=new Float32Array(1024);}this.micSource.connect(this.micAnalyser);this.update();
 }
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));if(this.output)this.output.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.02);}
 get position(){return Math.min(this.duration||0,this.fileSource?this.offset+this.ctx.currentTime-this.startedAt:this.offset);}
 pause(){const at=this.position;const old=this.fileSource;this.fileSource=null;old?.disconnect();try{old?.stop();}catch{}this.offset=at;this.update();this.speechNode?.port.postMessage('flush');}
 async resume(){if(!this.buffer||this.fileSource)return;await this.init();if(this.offset>=this.duration)this.offset=0;this.startFile();}
 seek(seconds){const playing=!!this.fileSource;this.pause();this.offset=Math.max(0,Math.min(this.duration,seconds));if(playing&&this.offset<this.duration)this.startFile();}
  setStemMode(mode){this.stemMode=mode;if(this.fileSource){const at=this.position;this.pause();this.offset=at;this.startFile();}}
  startFile(){let buf=this.buffer;if(this.stemMode==='vocals'&&this.stems?.vocals)buf=this.stems.vocals;else if(this.stemMode==='instrumental'&&this.stems?.instrumental)buf=this.stems.instrumental;const source=this.ctx.createBufferSource();source.buffer=buf;this.fileSource=source;this.startedAt=this.ctx.currentTime;source.connect(this.mix);source.connect(this.output);source.onended=()=>{if(this.fileSource!==source)return;this.fileSource=null;source.disconnect();this.offset=this.duration;this.update();if(!this.active)this.speechNode?.port.postMessage('flush');this.onEnd?.();};source.start(0,this.offset);this.update();}
 async file(file,onEnd){const token=++this.fileGeneration;await this.init();const buffer=await this.ctx.decodeAudioData(await file.arrayBuffer());if(token!==this.fileGeneration)return false;this.pause();this.stopDemo();this.buffer=buffer;this.duration=buffer.duration;this.offset=0;this.fileName=file.name;this.onEnd=onEnd;this.startFile();return true;}
 async demo(){this.stop();await this.init();const s=this.ctx.createOscillator(),g=this.ctx.createGain();s.frequency.value=440;g.gain.value=.25;s.connect(g);g.connect(this.mix);this.demoSource=s;this.demoGain=g;s.start();this.update();}
 sample(){if(!this.active)return null;this.analyser.getFloatTimeDomainData(this.wave);this.analyser.getFloatFrequencyData(this.freq);let sum=0,peak=0;for(const x of this.wave){sum+=x*x;peak=Math.max(peak,Math.abs(x));}const rms=20*Math.log10(Math.sqrt(sum/this.wave.length)||1e-8);const hz=pitch(this.wave,this.ctx.sampleRate);const bins=Array.from({length:72},(_,i)=>{const f=30*(Math.min(20000,this.ctx.sampleRate/2)/30)**(i/71);const next=30*(Math.min(20000,this.ctx.sampleRate/2)/30)**((i+1)/71);const lo=Math.max(0,Math.floor(f*8192/this.ctx.sampleRate)),hi=Math.min(4095,Math.ceil(next*8192/this.ctx.sampleRate));let peak=-100;for(let k=lo;k<=hi;k++)peak=Math.max(peak,this.freq[k]);return peak;});this.history.push(bins);if(this.history.length>65)this.history.shift();this.pitchHistory.push(hz);if(this.pitchHistory.length>160)this.pitchHistory.shift();let micRms=null;if(this.stream&&this.micAnalyser){this.micAnalyser.getFloatTimeDomainData(this.micWave);micRms=20*Math.log10(Math.sqrt(this.micWave.reduce((s,x)=>s+x*x,0)/1024)||1e-8);}let correlation=null,leftRms=rms,rightRms=rms;if(this.stereoAnalysers){this.stereoAnalysers[0].getFloatTimeDomainData(this.left);this.stereoAnalysers[1].getFloatTimeDomainData(this.right);let xy=0,xx=0,yy=0;for(let i=0;i<1024;i++){xy+=this.left[i]*this.right[i];xx+=this.left[i]**2;yy+=this.right[i]**2;}if(xx*yy>1e-12)correlation=Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy)));leftRms=20*Math.log10(Math.sqrt(this.left.reduce((s,x)=>s+x*x,0)/1024)||1e-8);rightRms=20*Math.log10(Math.sqrt(this.right.reduce((s,x)=>s+x*x,0)/1024)||1e-8);}return {correlation,leftRms,rightRms,micRms,rms,peak:20*Math.log10(peak||1e-8),hz,rate:this.ctx.sampleRate};}
}
