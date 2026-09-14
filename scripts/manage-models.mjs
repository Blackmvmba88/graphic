#!/usr/bin/env node
/**
 * manage-models.mjs · BlackMamba USB Model Manager
 * Permite descargar y gestionar modelos pesados de IA (Whisper Large v3 Turbo, Medium, Base)
 * directamente en una memoria USB externa (/Volumes/ADATA SC740) para no ocupar espacio en el disco Mac.
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, statSync, copyFileSync } from 'fs';
import path from 'path';

const USB_ROOT = '/Volumes/ADATA SC740/blackmamba_offloads/models';
const LOCAL_ROOT = path.resolve('native/whisper');

export const MODELS = {
  'large-turbo': {
    name: 'Whisper Large v3 Turbo (Modelo Pesado Alta Fidelidad)',
    file: 'ggml-large-v3-turbo.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    approxSize: '1.6 GB'
  },
  'medium': {
    name: 'Whisper Medium (Multilingüe)',
    file: 'ggml-medium.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    approxSize: '1.5 GB'
  },
  'base': {
    name: 'Whisper Base (Ligero)',
    file: 'ggml-base.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    approxSize: '148 MB'
  }
};

export function detectUsbStorage() {
  const volumes = ['/Volumes/ADATA SC740'];
  for (const vol of volumes) {
    if (existsSync(vol)) {
      try {
        const dfOut = execSync(`df -h "${vol}" | tail -n 1`, { encoding: 'utf8' });
        const parts = dfOut.trim().split(/\s+/);
        const avail = parts[3] || 'Desconocido';
        return {
          mounted: true,
          path: vol,
          modelsDir: path.join(vol, 'blackmamba_offloads/models'),
          availableSpace: avail
        };
      } catch {
        return {
          mounted: true,
          path: vol,
          modelsDir: path.join(vol, 'blackmamba_offloads/models'),
          availableSpace: 'Detectado'
        };
      }
    }
  }
  return { mounted: false, path: null, modelsDir: null, availableSpace: '0' };
}

export function listAvailableModels() {
  const usb = detectUsbStorage();
  const results = [];

  for (const [key, meta] of Object.entries(MODELS)) {
    let location = null;
    let size = null;
    let fullPath = null;

    if (usb.mounted && existsSync(path.join(usb.modelsDir, meta.file))) {
      fullPath = path.join(usb.modelsDir, meta.file);
      location = `USB (${usb.path})`;
      size = (statSync(fullPath).size / (1024 * 1024)).toFixed(1) + ' MB';
    } else if (existsSync(path.join(LOCAL_ROOT, meta.file))) {
      fullPath = path.join(LOCAL_ROOT, meta.file);
      location = 'Disco Interno (native/whisper)';
      size = (statSync(fullPath).size / (1024 * 1024)).toFixed(1) + ' MB';
    }

    results.push({
      key,
      ...meta,
      installed: !!location,
      location,
      size,
      fullPath
    });
  }

  return { usb, models: results };
}

export function getBestAvailableModelPath() {
  const { models } = listAvailableModels();
  // Priorizar modelos pesados en USB si existen
  const priority = ['large-turbo', 'medium', 'base'];
  for (const key of priority) {
    const m = models.find(x => x.key === key && x.installed);
    if (m && m.fullPath) return m;
  }
  return null;
}

export async function downloadModel(targetDir, modelKey) {
  const meta = MODELS[modelKey];
  if (!meta) throw new Error(`Modelo no encontrado: ${modelKey}`);

  mkdirSync(targetDir, { recursive: true });
  const destPath = path.join(targetDir, meta.file);
  console.log(`\x1b[36m[BlackMamba Models]\x1b[0m Descargando ${meta.name} (~${meta.approxSize})...`);
  console.log(`Destino: \x1b[33m${destPath}\x1b[0m`);

  return new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-L', '-C', '-', '--fail', '--retry', '3', '-o', destPath, meta.url], {
      stdio: 'inherit'
    });
    curl.on('close', code => {
      if (code === 0) {
        console.log(`\x1b[32m✓ ${meta.file} descargado exitosamente en ${destPath}!\x1b[0m`);
        resolve(destPath);
      } else {
        reject(new Error(`curl finalizó con código ${code}`));
      }
    });
    curl.on('error', reject);
  });
}

// Ejecución CLI directa
if (process.argv[1]?.endsWith('manage-models.mjs')) {
  const action = process.argv[2] || 'status';
  const usb = detectUsbStorage();

  if (action === 'status') {
    console.log('\n--- ESTADO DE ALMACENAMIENTO DE MODELOS ---');
    console.log(`Unidad USB externa: ${usb.mounted ? `✓ Conectada (${usb.path}) - Espacio libre: ${usb.availableSpace}` : '✗ No detectada'}`);
    console.log('\nModelos registrados:');
    const { models } = listAvailableModels();
    models.forEach(m => {
      console.log(` - [${m.key}] ${m.name}`);
      console.log(`   Estado: ${m.installed ? `✓ Instalado en ${m.location} (${m.size})` : `✗ No instalado (${m.approxSize})`}`);
    });
    console.log('\nComandos:');
    console.log('  node scripts/manage-models.mjs download-usb [large-turbo|medium|base]');
    console.log('  node scripts/manage-models.mjs copy-to-usb\n');
  } else if (action === 'download-usb') {
    const targetModel = process.argv[3] || 'large-turbo';
    if (!usb.mounted) {
      console.error('\x1b[31mError: La memoria USB no está montada en /Volumes/ADATA SC740\x1b[0m');
      process.exit(1);
    }
    downloadModel(usb.modelsDir, targetModel).catch(e => {
      console.error('Error al descargar:', e);
      process.exit(1);
    });
  } else if (action === 'copy-to-usb') {
    if (!usb.mounted) {
      console.error('\x1b[31mError: La memoria USB no está montada\x1b[0m');
      process.exit(1);
    }
    mkdirSync(usb.modelsDir, { recursive: true });
    const baseLocal = path.join(LOCAL_ROOT, 'ggml-base.bin');
    if (existsSync(baseLocal)) {
      console.log('Copiando ggml-base.bin a la USB...');
      copyFileSync(baseLocal, path.join(usb.modelsDir, 'ggml-base.bin'));
      console.log('\x1b[32m✓ ggml-base.bin respaldado en la USB.\x1b[0m');
    }
  }
}
