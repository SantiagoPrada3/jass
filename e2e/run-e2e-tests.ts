/**
 * Script de ejecución de pruebas E2E - Sistema JASS
 * Este archivo puede ejecutarse directamente con: npx ts-node e2e/run-e2e-tests.ts
 */

import { spawn } from 'child_process';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}   SISTEMA JASS - PRUEBAS E2E CON SELENIUM WEBDRIVER${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

console.log(`${colors.yellow}Prerrequisitos:${colors.reset}`);
console.log(`  1. La aplicación debe estar corriendo en http://localhost:4200`);
console.log(`  2. Chrome debe estar instalado`);
console.log(`  3. Las dependencias deben estar instaladas (npm install)\n`);

console.log(`${colors.cyan}Iniciando pruebas de Tipos de Incidencias...${colors.reset}\n`);

const testFile = path.join(__dirname, 'incident-types', 'incident-types.e2e.ts');

const child = spawn('npx', ['ts-node', testFile], {
  shell: true,
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

child.on('close', (code) => {
  if (code === 0) {
    console.log(`\n${colors.green}✓ Todas las pruebas completadas exitosamente${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}✗ Algunas pruebas fallaron (código de salida: ${code})${colors.reset}\n`);
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(`${colors.red}Error al ejecutar las pruebas:${colors.reset}`, error);
  process.exit(1);
});
