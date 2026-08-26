#!/usr/bin/env node
/**
 * push-env-to-vercel.mjs
 * Lê .env.local e faz upsert de cada variável no projeto Vercel via API.
 * Não loga valores — só nomes das variáveis.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- config ---
const PROJECT_ID = 'prj_Y5Y7aCZtvYGGbFTaFa5AyidaGQzV';
const TEAM_ID    = 'team_8kNRmzVAZO2R3RmRtb8xvHj6';
const TARGETS    = ['production', 'preview', 'development'];

// Lê token autenticado do CLI local
const authFile = JSON.parse(
  readFileSync(
    `${process.env.HOME}/Library/Application Support/com.vercel.cli/auth.json`,
    'utf8'
  )
);
const TOKEN = authFile.token;

// Parse .env.local
const envRaw = readFileSync(join(ROOT, '.env.local'), 'utf8');
const vars = [];
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) continue;
  const key   = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  if (key && value) vars.push({ key, value });
}

// Determina tipo: encrypted para segredos, plain para NEXT_PUBLIC_
function envType(key) {
  return key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted';
}

// Faz upsert via Vercel API v10
async function upsertEnv(key, value) {
  const body = {
    key,
    value,
    type: envType(key),
    target: TARGETS,
  };
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}&upsert=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ✗ ${key} — ${data.error?.message ?? JSON.stringify(data)}`);
  } else {
    console.log(`  ✓ ${key} (${envType(key)})`);
  }
}

console.log(`\nPushing ${vars.length} env vars → ${PROJECT_ID}\n`);
for (const { key, value } of vars) {
  await upsertEnv(key, value);
}
console.log('\nDone.');
