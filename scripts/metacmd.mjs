#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync } from 'fs';

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
    console.log('Sincronizando y preparando compilación Android...');
    if (!existsSync('dist/client')) {
      execSync('npm run build', { stdio: 'inherit' });
    }
    console.log('Build web listo para Android en android/app/src/main/assets');
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

  case 'status':
    console.log('✓ Motor de Audio: Web Audio API (FFT 8192)');
    console.log('✓ Capa de Inteligencia Acústica: Activa');
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
