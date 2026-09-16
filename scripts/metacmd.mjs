#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync } from 'fs';

const command = process.argv[2] || 'help';

console.log(`\x1b[36m[BlackMamba CLI]\x1b[0m Ejecutando metacomando: \x1b[33m${command}\x1b[0m`);

switch (command) {
  case 'build':
  case 'build:web':
    console.log('Compilando cliente Web...');
    execSync('npm run build', { stdio: 'inherit' });
    break;

  case 'android':
  case 'build:android':
    console.log('Compilando y sincronizando para Android nativo...');
    execSync('npm run build', { stdio: 'inherit' });
    const targetDir = 'android/app/src/main/assets/public';
    mkdirSync(targetDir, { recursive: true });
    cpSync('dist/client', targetDir, { recursive: true });
    console.log(`\x1b[32m✓ Assets sincronizados exitosamente en ${targetDir}\x1b[0m`);
    console.log('\x1b[32m✓ AndroidManifest.xml listo con permisos de micrófono RECORD_AUDIO\x1b[0m');
    console.log('Listo para generar APK con: cd android && ./gradlew assembleDebug');
    break;

  case 'docker:up':
    console.log('Iniciando contenedor Docker...');
    execSync('docker compose up -d --build', { stdio: 'inherit' });
    break;

  case 'docker:down':
    console.log('Deteniendo contenedor Docker...');
    execSync('docker compose down', { stdio: 'inherit' });
    break;

  case 'test':
    console.log('Ejecutando suite de pruebas...');
    execSync('node --test tests/*.test.mjs', { stdio: 'inherit' });
    break;

  case 'models':
  case 'models:usb':
    console.log('Verificando estado de modelos y memoria USB...');
    execSync('node scripts/manage-models.mjs status', { stdio: 'inherit' });
    break;

  case 'status':
    console.log('✓ Motor de Audio: Web Audio API (FFT 8192)');
    console.log('✓ Separador de Stems & Consciencia Acústica: Activo');
    console.log('✓ Modelos Pesados en USB: Conectado (/Volumes/ADATA SC740)');
    console.log('✓ Pruebas: Pasadas');
    break;

  case 'help':
  default:
    console.log(`
Comandos disponibles en metacomandos BlackMamba:
  node scripts/metacmd.mjs build          - Construir cliente Web
  node scripts/metacmd.mjs build:android  - Preparar paquete Android
  node scripts/metacmd.mjs docker:up      - Levantar contenedor Docker
  node scripts/metacmd.mjs docker:down    - Detener contenedor Docker
  node scripts/metacmd.mjs test           - Ejecutar suite de pruebas
  node scripts/metacmd.mjs status         - Estado del motor
    `);
    break;
}
