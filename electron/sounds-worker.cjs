const { parentPort, workerData } = require('node:worker_threads');
let classifier;
async function load() {
  const {pipeline,env}=await import('@huggingface/transformers');
  env.allowRemoteModels=false;
  env.allowLocalModels=true;
  classifier=await pipeline('audio-classification',workerData.model,{dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
}
parentPort.on('message',async({id,wav})=>{
  try {
    if(!classifier)await load();
    const buffer=Buffer.from(wav), audio=new Float32Array((buffer.length-44)/2);
    for(let i=0;i<audio.length;i++)audio[i]=buffer.readInt16LE(44+i*2)/32768;
    const tags=await classifier(audio,{top_k:3});
    parentPort.postMessage({id,tags});
  }catch(error){parentPort.postMessage({id,error:error.message});}
});
