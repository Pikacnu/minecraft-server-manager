import { rmSync } from 'node:fs';
import { $ } from 'bun';
import { autoImports } from 'bun-plugin-auto-imports';

const DIST = './dist';
const HTML = './src/web/entry/index.html';
const CSS = './src/web/entry/index.css';

rmSync(DIST, { recursive: true, force: true });
await $`mkdir -p ${DIST}`.quiet();

console.log('Building CSS...');
await $`./node_modules/.bin/tailwindcss -i ./tailwind.css -o ${CSS} --minify`.quiet();

const originalHtml = await Bun.file(HTML).text();
await Bun.write(
  HTML,
  originalHtml.replace(
    '<link rel="stylesheet" href="tailwindcss" />',
    '<link rel="stylesheet" href="./index.css" />',
  ),
);

try {
  console.log('Compiling standalone binary...');
  const isWin = process.platform === 'win32';
  const ext = isWin ? '.exe' : '';
  const out = `${DIST}/minecraft-server-manager${ext}`;

  // unzipper has an optional require('@aws-sdk/client-s3') — external-ignore it
  const result = await Bun.build({
    entrypoints: ['./src/index.ts'],
    compile: { outfile: out },
    plugins: [autoImports({ dirs: ['./src/utils', './src/deployment'] })],
    external: ['@aws-sdk/client-s3'],
    minify: true,
    sourcemap: 'linked',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.PREVIEW_MODE': JSON.stringify('false'),
    },
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }

  const mb = ((await Bun.file(out).size) / 1024 / 1024).toFixed(1);
  console.log(`\n✅ ${out} (${mb} MB)`);
} finally {
  await Bun.write(HTML, originalHtml);
  rmSync(CSS, { force: true });
}
