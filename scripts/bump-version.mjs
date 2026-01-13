#!/usr/bin/env node

/**
 * Script para incrementar a versão do package.json
 * Incrementa o patch version (1.3.0 -> 1.3.1)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');
const versionFilePath = join(rootDir, 'src', 'version.ts');

try {
  // Ler package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // Obter versão atual
  const currentVersion = packageJson.version || '0.0.0';
  const versionParts = currentVersion.split('.').map(Number);
  
  // Garantir que temos pelo menos 3 partes (major.minor.patch)
  while (versionParts.length < 3) {
    versionParts.push(0);
  }
  
  // Incrementar patch version
  versionParts[2] = (versionParts[2] || 0) + 1;
  
  // Se patch chegar a 100, incrementar minor e resetar patch
  if (versionParts[2] >= 100) {
    versionParts[1] = (versionParts[1] || 0) + 1;
    versionParts[2] = 0;
  }
  
  // Se minor chegar a 10, incrementar major e resetar minor
  if (versionParts[1] >= 10) {
    versionParts[0] = (versionParts[0] || 0) + 1;
    versionParts[1] = 0;
  }
  
  const newVersion = versionParts.join('.');
  
  // Atualizar package.json
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  
  // Atualizar arquivo de versão TypeScript
  const versionFileContent = `// Versão do aplicativo - atualizada automaticamente pelo script bump-version.mjs
// Este arquivo é gerado automaticamente, não edite manualmente
export const APP_VERSION = '${newVersion}';
`;
  writeFileSync(versionFilePath, versionFileContent, 'utf8');
  
  console.log(`Version updated: ${currentVersion} -> ${newVersion}`);
  
  // Adicionar arquivos atualizados ao staging area para incluir no commit
  try {
    execSync(`git add "${packageJsonPath}" "${versionFilePath}"`, { stdio: 'inherit', cwd: rootDir });
  } catch (error) {
    // Ignorar erro se não estiver em um repositório git
    console.warn('Warning: Could not add files to git staging area');
  }
  
  process.exit(0);
} catch (error) {
  console.error('Error updating version:', error);
  process.exit(1);
}
