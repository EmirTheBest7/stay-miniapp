// Bundle budget (gzip). Entry <= 60 KB gzip; the map and the wizard are lazy chunks.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const dir = process.argv[2] ?? 'dist/assets';
if (!existsSync(dir)) { console.error(`size check: ${dir} does not exist (build first)`); process.exit(1); }
const BUDGET = { entry: 60 * 1024, adminChunk: 80 * 1024, css: 12 * 1024 };
let fail = false;
for (const f of readdirSync(dir)) {
  const gz = gzipSync(readFileSync(`${dir}/${f}`)).length;
  const kind = f.endsWith('.css') ? 'css' : /^(map|wizard)/i.test(f) ? 'adminChunk' : 'entry';
  const ok = gz <= BUDGET[kind];
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${f} ${(gz / 1024).toFixed(1)} KB gzip (budget ${BUDGET[kind] / 1024} KB, ${kind})`);
  if (!ok) fail = true;
}
process.exit(fail ? 1 : 0);
