const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
class WhisperService {
  constructor(directory) { this.directory=directory; this.child=null; this.generation=0; this.busy=false; }
  async status() { try { await Promise.all(['whisper-cli','ggml-base.bin'].map(f=>fs.access(path.join(this.directory,f)))); return {available:true,model:'Whisper Base · local'}; } catch { return {available:false,model:'Whisper no está instalado en esta versión'}; } }
  cancel() { this.generation++; this.child?.kill('SIGTERM'); }
  async transcribe(bytes,language='es') {
    if(this.busy) throw new Error('Whisper está procesando otro fragmento.');
    const buffer=Buffer.from(bytes);
    if(buffer.length<44||buffer.length>16000*2*15+44||buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WAVE'||buffer.readUInt16LE(20)!==1||buffer.readUInt16LE(22)!==1||buffer.readUInt32LE(24)!==16000||buffer.readUInt16LE(34)!==16)throw new Error('Fragmento WAV inválido.');
    if(!['es','en','auto'].includes(language))throw new Error('Idioma no válido.');
    this.busy=true;const generation=this.generation;let dir;
    try {
      dir=await fs.mkdtemp(path.join(os.tmpdir(),'blackmamba-whisper-'));await fs.chmod(dir,0o700);
      const wav=path.join(dir,'audio.wav'),out=path.join(dir,'result');await fs.writeFile(wav,buffer,{mode:0o600});
      await new Promise((resolve,reject)=>{
        const child=spawn(path.join(this.directory,'whisper-cli'),['-m',path.join(this.directory,'ggml-base.bin'),'-f',wav,'-l',language,'-otxt','-of',out,'-np','-nt','-t','4','-bo','1','-bs','1','-nf','-sns'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
        this.child=child;let errors='';const timer=setTimeout(()=>child.kill('SIGTERM'),90000);
        child.stderr.on('data',d=>{errors=(errors+d).slice(-4000)});
        child.on('error',e=>{clearTimeout(timer);reject(new Error('No se pudo iniciar Whisper local: '+e.code));});
        child.on('close',code=>{clearTimeout(timer);this.child=null;if(generation!==this.generation)reject(new Error('Transcripción cancelada.'));else if(code!==0)reject(new Error('Whisper no pudo procesar este fragmento.'));else resolve();});
      });
      return {text:(await fs.readFile(out+'.txt','utf8')).trim().replace(/\[_[^\]]+\]/g,'').trim()};
    } finally {this.busy=false;if(dir)await fs.rm(dir,{recursive:true,force:true});}
  }
}
module.exports={WhisperService};
