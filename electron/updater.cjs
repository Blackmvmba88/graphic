const {dialog,app}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {execFile,spawn}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile);
let busy=false;
const newer=(candidate,current)=>{const a=candidate.split('.').map(Number),b=current.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false};
async function installUpdate(window){
 if(busy)return;busy=true;let mount,staging;
 try{
  if(!app.isPackaged)throw new Error('Las actualizaciones se instalan desde la aplicación empaquetada.');
  const selected=await dialog.showOpenDialog(window,{title:'Elegir actualización de BlackMamba',properties:['openFile'],filters:[{name:'Instalador macOS',extensions:['dmg']}]});
  if(selected.canceled)return;
  const dmg=selected.filePaths[0];await run('/usr/bin/hdiutil',['verify',dmg],{timeout:120000,maxBuffer:1024*1024});
  mount=await fs.mkdtemp(path.join(os.tmpdir(),'blackmamba-update-'));
  await run('/usr/bin/hdiutil',['attach','-readonly','-nobrowse','-mountpoint',mount,dmg],{timeout:120000});
  const candidate=path.join(mount,'BlackMamba Music Engine.app'),plist=path.join(candidate,'Contents','Info.plist');
  const read=async key=>(await run('/usr/bin/plutil',['-extract',key,'raw',plist])).stdout.trim();
  if(await read('CFBundleIdentifier')!=='com.blackmambarecords.musicengine')throw new Error('Este instalador no corresponde a BlackMamba Music Engine.');
  const version=await read('CFBundleShortVersionString');
  if(!/^\d+\.\d+\.\d+$/.test(version)||!newer(version,app.getVersion()))throw new Error('Elige una versión posterior a '+app.getVersion()+'.');
  const executable=await read('CFBundleExecutable');if(executable.includes('/')||executable.includes('..'))throw new Error('Ejecutable inválido.');
  const arch=(await run('/usr/bin/lipo',['-archs',path.join(candidate,'Contents','MacOS',executable)])).stdout;
  if(!arch.split(/\s+/).includes(process.arch==='arm64'?'arm64':'x86_64'))throw new Error('El instalador no es compatible con este Mac.');
  const target=path.resolve(app.getPath('exe'),'..','..','..'),parent=path.dirname(target);
  if(target.startsWith('/Volumes/'))throw new Error('Arrastra primero la aplicación a Aplicaciones y ábrela desde allí.');
  await fs.access(parent,2);
  const answer=await dialog.showMessageBox(window,{type:'question',title:'Actualizar BlackMamba',message:`Instalar versión ${version} y reiniciar`,detail:'Elige solo instaladores de confianza. Se reemplazará la aplicación; tus temas y revisiones permanecerán. Se conservarán el DMG y una copia de respaldo de la app anterior. Esta versión no verifica una firma Developer ID del proveedor.',buttons:['Cancelar','Actualizar y reiniciar'],defaultId:0,cancelId:0});
  if(answer.response!==1)return;
  staging=await fs.mkdtemp(path.join(parent,'.blackmamba-update-'));
  const fresh=path.join(staging,'BlackMamba Music Engine.app');await run('/usr/bin/ditto',[candidate,fresh],{timeout:180000});
  await run('/usr/bin/hdiutil',['detach',mount]);await fs.rmdir(mount);mount=null;
  const backup=path.join(parent,`BlackMamba Music Engine ${app.getVersion()} respaldo ${Date.now()}.app`);
  const helper=path.join(staging,'apply.sh');
  await fs.writeFile(helper,`#!/bin/sh\nset -eu\noldpid="$1"; target="$2"; fresh="$3"; backup="$4"\nwhile kill -0 "$oldpid" 2>/dev/null; do sleep 1; done\n/bin/mv "$target" "$backup"\nif ! /bin/mv "$fresh" "$target"; then /bin/mv "$backup" "$target"; /usr/bin/open "$target"; exit 1; fi\n/usr/bin/open "$target"\n`,{mode:0o700});
  const child=spawn('/bin/sh',[helper,String(process.pid),target,fresh,backup],{detached:true,stdio:'ignore'});child.unref();staging=null;app.quit();
 }catch(error){await dialog.showMessageBox(window,{type:'error',message:'No se pudo actualizar',detail:error.message});}
 finally{if(mount){await run('/usr/bin/hdiutil',['detach',mount]).catch(()=>{});await fs.rmdir(mount).catch(()=>{});}if(staging)await fs.rm(staging,{recursive:true,force:true});busy=false;}
}
module.exports={installUpdate,newer};
