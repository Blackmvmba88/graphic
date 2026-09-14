const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('blackmambaSpeech',{
  update:()=>ipcRenderer.invoke('app:update'),
  status:()=>ipcRenderer.invoke('speech:status'),
  transcribe:(wav,language)=>ipcRenderer.invoke('speech:transcribe',wav,language),
  classify:(wav)=>ipcRenderer.invoke('sounds:classify',wav),
  cancel:()=>ipcRenderer.invoke('speech:cancel'),
});
