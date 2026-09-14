import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {encodeWav} from '../src/speech.js';
import {WhisperService} from '../electron/whisper.cjs';
test('resamples 48 kHz audio to mono PCM16 without changing duration',()=>{
 const audio=Float32Array.from({length:48000},(_,i)=>Math.sin(2*Math.PI*440*i/48000)*.5),wav=encodeWav(audio,48000),v=new DataView(wav);
 assert.equal(wav.byteLength,32044);assert.equal(v.getUint32(24,true),16000);assert.equal(v.getUint16(22,true),1);
 let crossings=0;for(let i=1;i<16000;i++)if(v.getInt16(44+2*(i-1),true)<=0&&v.getInt16(44+2*i,true)>0)crossings++;assert.ok(Math.abs(crossings-440)<=1);
});
function processor(){let Processor;const messages=[];const sandbox={sampleRate:16000,AudioWorkletProcessor:class{constructor(){this.port={postMessage:v=>messages.push(v)}}},registerProcessor:(name,p)=>{Processor=p}};vm.runInNewContext(fs.readFileSync(new URL('../public/speech-worklet.js',import.meta.url),'utf8'),sandbox);return {p:new Processor(),messages};}
test('silence creates no transcription work',()=>{const {p,messages}=processor();for(let i=0;i<1200;i++)p.process([[new Float32Array(128)]]);p.port.onmessage({data:'flush'});assert.equal(messages.length,0)});
test('speech is emitted after pause and its final tail can be flushed',()=>{const {p,messages}=processor();for(let i=0;i<125;i++)p.process([[new Float32Array(128).fill(.1)]]);for(let i=0;i<90;i++)p.process([[new Float32Array(128)]]);assert.equal(messages.length,1);assert.ok(messages[0].duration>=1.6);for(let i=0;i<50;i++)p.process([[new Float32Array(128).fill(.1)]]);p.port.onmessage({data:'flush'});assert.equal(messages.length,2)});
test('Whisper rejects invalid audio before starting a process',async()=>{const s=new WhisperService('/nonexistent');await assert.rejects(()=>s.transcribe(new ArrayBuffer(44),'auto'),/inválido/);assert.equal(s.busy,false)});
import {AudioEngine} from '../src/audio.js';
test('turning off microphone preserves file playback',()=>{const e=new AudioEngine();let micStopped=false,fileStopped=false;e.ctx={currentTime:0};e.mix={gain:{setValueAtTime(){}}};e.stream={getTracks:()=>[{stop:()=>{micStopped=true}}]};e.micSource={disconnect(){}};e.fileSource={stop(){fileStopped=true}};e.fileName='song.wav';e.stopMicrophone();assert.equal(micStopped,true);assert.equal(fileStopped,false);assert.ok(e.fileSource);assert.equal(e.active,true);assert.equal(e.kind,'song.wav');});
test('turning off file preserves microphone',()=>{const e=new AudioEngine();e.ctx={currentTime:0};e.mix={gain:{setValueAtTime(){}}};e.stream={getTracks:()=>[]};e.fileSource={disconnect(){},stop(){}};e.stopFile();assert.ok(e.stream);assert.equal(e.active,true);assert.equal(e.kind,'Micrófono');});
test('initial microphone request does not stop an existing file',async()=>{const e=new AudioEngine();let stopped=false;e.fileSource={stop(){stopped=true}};e.fileName='playing.wav';e.ctx={currentTime:0,createAnalyser:()=>({}),createMediaStreamSource:()=>({connect(){}})};e.mix={gain:{setValueAtTime(){}}};e.init=async()=>{};const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[]})}}});try{await e.microphone();assert.equal(stopped,false);assert.ok(e.fileSource);assert.ok(e.stream);assert.match(e.kind,/playing.wav/);}finally{if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;}});

import {translateText} from '../src/liveSpeech.js';
test('translateText converts known phrases between Spanish and English',()=>{
  assert.equal(translateText('el sonido se convierte en conocimiento'), 'Sound becomes knowledge');
  assert.equal(translateText('sound becomes knowledge'), 'El sonido se convierte en conocimiento');
  assert.equal(translateText('la musica es vida'), 'The music is life');
});
