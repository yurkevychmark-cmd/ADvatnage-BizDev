// Чиста частина агента (src/lib/agent/core.ts і підказки) для node-скриптів і тестів: збирає TS у тимчасовий ESM.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const agentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/lib/agent');

export async function loadAgent() {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'agent-')), 'agent.mjs');
  await build({
    stdin: {
      contents: `export * from './core'; export { TRIAGE_SYSTEM, triageUser, JUDGE_SYSTEM, judgeUser } from './prompts'; export { findLeak } from './leak';`,
      resolveDir: agentDir, loader: 'ts',
    },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent',
    plugins: [{ name: 'raw', setup(b) {
      b.onResolve({ filter: /\?raw$/ }, (a) => ({ path: path.resolve(a.resolveDir, a.path.replace(/\?raw$/, '')), namespace: 'raw' }));
      b.onLoad({ filter: /.*/, namespace: 'raw' }, (a) => ({ contents: fs.readFileSync(a.path, 'utf8'), loader: 'text' }));
    } }],
  });
  return import(pathToFileURL(out).href);
}
