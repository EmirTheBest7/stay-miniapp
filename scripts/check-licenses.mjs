// Fails when a production dependency is not on the allowlist. FullCalendar: ONLY the five MIT "standard" packages.
import { readFileSync, existsSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const prod = Object.keys(pkg.dependencies ?? {});
const FC_ALLOWED = ['@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/list', '@fullcalendar/interaction'];
const OK = /^(MIT|ISC|BSD-2-Clause|BSD-3-Clause|Apache-2\.0|0BSD)$/;
let bad = [];
const seen = new Set();
function walk(name) {
  if (seen.has(name)) return;
  seen.add(name);
  const p = `node_modules/${name}/package.json`;
  if (!existsSync(p)) { bad.push(`${name}: not installed`); return; }
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const lic = typeof j.license === 'string' ? j.license : j.license?.type ?? '';
  if (name.startsWith('@fullcalendar/')) {
    if (!FC_ALLOWED.includes(name)) bad.push(`${name}: not an allowed FullCalendar package (premium?)`);
    else if (lic !== 'MIT') bad.push(`${name}: license ${lic}`);
  } else if (!OK.test(lic)) bad.push(`${name}: license "${lic}"`);
  for (const d of Object.keys(j.dependencies ?? {})) walk(d);
}
prod.forEach(walk);
const src = readFileSync('package.json', 'utf8') + (existsSync('package-lock.json') ? readFileSync('package-lock.json', 'utf8') : '');
if (/schedulerLicenseKey|fullcalendar-scheduler|@fullcalendar\/(resource|premium|timeline|adaptive|scrollgrid)/.test(src)) bad.push('premium FullCalendar package or license key referenced');
// one copy of preact only
const lock = existsSync('package-lock.json') ? JSON.parse(readFileSync('package-lock.json', 'utf8')) : { packages: {} };
const preacts = Object.keys(lock.packages ?? {}).filter((k) => /node_modules\/preact$/.test(k));
if (preacts.length > 1) bad.push(`more than one preact copy: ${preacts.join(', ')}`);
if (bad.length) { console.error('license check FAILED:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`license check ok (${seen.size} production packages)`);
