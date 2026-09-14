const {Worker}=require('node:worker_threads');
const path=require('node:path');
class SoundService {
  constructor(model){this.model=model;this.worker=null;this.pending=null;this.counter=0;}
  classify(wav){
    if(this.pending)return Promise.reject(new Error('El clasificador está ocupado.'));
    if(!this.worker){
      this.worker=new Worker(path.join(__dirname,'sounds-worker.cjs'),{workerData:{model:this.model}});
      const current=this.worker;
      this.worker.on('message',message=>{if(this.pending?.id===message.id){const p=this.pending;this.pending=null;clearTimeout(p.timer);message.error?p.reject(new Error(message.error)):p.resolve(message.tags);}});
      this.worker.on('error',error=>{if(this.worker===current){this.fail(error);this.worker=null;}});
      this.worker.on('exit',()=>{if(this.worker===current){if(this.pending)this.fail(new Error('Clasificador detenido.'));this.worker=null;}});
    }
    return new Promise((resolve,reject)=>{const id=++this.counter;const timer=setTimeout(()=>this.close(),90000);this.pending={id,resolve,reject,timer};this.worker.postMessage({id,wav});});
  }
  fail(error){if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}}
  close(){this.fail(new Error('Clasificación cancelada.'));const worker=this.worker;this.worker=null;return worker?.terminate();}
}
module.exports={SoundService};
