// Procedural interior illustrations: no external images, no real photos, tiny and instant. 4:3.
const PAL: [string, string, string][] = [
  ['#e9dfd0', '#c9b79c', '#7a8f7a'], ['#dfe7ea', '#b7c9d1', '#5f7f8c'], ['#efe1dd', '#d3b0a6', '#8c6b63'],
  ['#e5e8d9', '#bcc79d', '#6b7d4a'], ['#e8e2ee', '#c0b3d2', '#6f5f8c'], ['#f1e8d3', '#dcc48f', '#8c7440'],
];

function mulberry(a: number): () => number {
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function photoSvg(seed: number, idx: number, w = 640, h = 480): string {
  const r = mulberry(seed * 31 + idx * 7919);
  const [wall, wall2, accent] = PAL[Math.floor(r() * PAL.length)] as [string, string, string];
  const scene = idx % 4;
  const sky = ['#bfe0f5', '#f6d9b0', '#cfe6d3', '#d9d3f0'][Math.floor(r() * 4)];
  const winX = 60 + r() * 360, winW = 130 + r() * 90;
  let furniture = '';
  if (scene === 0) furniture = `<rect x="70" y="300" width="300" height="82" rx="18" fill="${accent}"/><rect x="70" y="268" width="300" height="48" rx="16" fill="${accent}" opacity=".85"/><rect x="400" y="350" width="140" height="26" rx="8" fill="#fff" opacity=".5"/>`;
  if (scene === 1) furniture = `<rect x="150" y="310" width="340" height="72" rx="10" fill="#fff" opacity=".85"/><rect x="150" y="280" width="120" height="40" rx="12" fill="${accent}"/><rect x="120" y="300" width="30" height="82" rx="6" fill="${wall2}"/>`;
  if (scene === 2) furniture = `<rect x="60" y="330" width="360" height="14" rx="4" fill="${wall2}"/><rect x="80" y="344" width="14" height="40" fill="${wall2}"/><rect x="386" y="344" width="14" height="40" fill="${wall2}"/><circle cx="240" cy="300" r="26" fill="${accent}"/>`;
  if (scene === 3) furniture = `<rect x="90" y="250" width="200" height="132" rx="8" fill="#fff" opacity=".8"/><rect x="108" y="268" width="164" height="12" fill="${accent}" opacity=".5"/><rect x="108" y="296" width="164" height="12" fill="${accent}" opacity=".5"/><rect x="330" y="270" width="150" height="112" rx="10" fill="${accent}" opacity=".9"/>`;
  const plant = `<rect x="${520 - idx * 10}" y="340" width="34" height="42" rx="6" fill="${wall2}"/><circle cx="${537 - idx * 10}" cy="318" r="30" fill="#5f8f5a" opacity=".9"/>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="${wall2}"/></linearGradient></defs>` +
    `<rect width="640" height="480" fill="url(#g)"/><rect y="382" width="640" height="98" fill="${wall2}"/><rect y="382" width="640" height="6" fill="#000" opacity=".06"/>` +
    `<rect x="${winX}" y="70" width="${winW}" height="170" rx="6" fill="${sky}"/><rect x="${winX + winW / 2 - 2}" y="70" width="4" height="170" fill="#fff"/><rect x="${winX}" y="150" width="${winW}" height="4" fill="#fff"/>` +
    furniture + plant + `</svg>`);
}
