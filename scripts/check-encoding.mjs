import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const scanRoots = [
  resolve(root, 'apps', 'web', 'src'),
  resolve(root, 'apps', 'api', 'src'),
];
const visibleExtensions = new Set(['.css', '.html', '.ts', '.tsx']);
const suspiciousSequences = [
  { label: 'carácter de reemplazo Unicode', pattern: /\uFFFD/u },
  { label: 'texto UTF-8 interpretado como Latin-1 (Ã)', pattern: /\u00C3[\u0080-\u00BF]/u },
  { label: 'texto UTF-8 interpretado como Latin-1 (Â)', pattern: /\u00C2[\u0080-\u00BF]/u },
  { label: 'puntuación UTF-8 mal decodificada', pattern: /\u00E2[\u0080-\u00BF]/u },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.isFile() && visibleExtensions.has(extname(entry.name))) files.push(path);
  }

  return files;
}

const files = (await Promise.all(scanRoots.map(collectFiles))).flat();
const findings = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/u);

  lines.forEach((line, index) => {
    for (const check of suspiciousSequences) {
      if (check.pattern.test(line)) {
        findings.push(`${relative(root, file)}:${index + 1} — ${check.label}`);
      }
    }
  });
}

if (findings.length > 0) {
  console.error('Se detectaron posibles regresiones de codificación:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log(`Codificación validada en ${files.length} archivos visibles.`);
}
