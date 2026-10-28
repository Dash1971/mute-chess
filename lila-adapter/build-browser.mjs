import { build } from 'esbuild';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const outfile = process.argv[2];
if (!outfile) throw Error('Usage: node build-browser.mjs /path/to/lila/public/nosweat/nostr.js');
await build({ entryPoints: [fileURLToPath(new URL('./browser/login.mjs', import.meta.url))], outfile: resolve(outfile),
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2022', legalComments: 'eof' });
