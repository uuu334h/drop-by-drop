// Bundles the prototype into one artifact-ready page: dist/drop-by-drop.html.
// The page has no <html>/<head>/<body> of its own: claude.ai wraps it when it is published.
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

let commit = 'dev';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  /* not a git checkout */
}
const stamp = `${commit} ${new Date().toISOString().slice(0, 10)}`;

const result = await build({
  entryPoints: ['src/ui/main.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  jsxImportSource: 'preact',
  define: { __BUILD__: JSON.stringify(stamp) },
  write: false,
  legalComments: 'none',
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await readFile('src/ui/styles.css', 'utf8');
const template = await readFile('src/ui/index.html', 'utf8');
const html = template.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);

await mkdir('dist', { recursive: true });
await writeFile('dist/drop-by-drop.html', html);
console.log(`dist/drop-by-drop.html  ${(html.length / 1024).toFixed(1)} KB  build ${stamp}`);
