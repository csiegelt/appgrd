import { mkdir, cp, lstat, realpath, rm } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.vercel-static');
if (relative(root, output) !== '.vercel-static' || !output.startsWith(root + sep)) throw Error('Directorio de salida inválido.');
try {
  const stat = await lstat(output);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (await realpath(output)).toLowerCase() !== output.toLowerCase()) throw Error('La salida debe ser una carpeta real dentro del proyecto.');
  await rm(output, { recursive: true });
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(output);
// Publish only the interface and teaching resources. Server code and credentials are excluded.
for (const name of ['index.html', 'js', 'css', 'manual', 'plantillas']) {
  await cp(resolve(root, name), resolve(output, name), { recursive: true, dereference: false });
}
console.log('Interfaz preparada en .vercel-static; la API se publica como Vercel Function.');
