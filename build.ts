import { $ } from 'bun';

console.log('Starting build...');

// Clean up dist
await $`rm -rf dist`;
await $`mkdir dist`;

// Build Tailwind CSS
console.log('Building CSS...');
// Using the locally installed @tailwindcss/cli
await $`./node_modules/.bin/tailwindcss -i ./tailwind.css -o ./dist/index.css --minify`;

// Build JS
console.log('Building JS...');
const result = await Bun.build({
  entrypoints: ['./src/web/entry/frontend.tsx'],
  outdir: './dist',
  target: 'browser',
  minify: true,
  naming: 'index-[hash].[ext]',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.PREVIEW_MODE': JSON.stringify('true'),
  },
});

if (!result.success) {
  console.error('JS Build failed');
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

// Get the built js filename
const jsFile = result.outputs
  .find((o) => o.path.endsWith('.js'))
  ?.path.split(/[\\/]/)
  .pop();

console.log(`JS built: ${jsFile}`);

// Process index.html
console.log('Processing HTML...');
let html = await Bun.file('./src/web/entry/index.html').text();

// Remove existing css link if any and inject the new one
html = html.replace(/<link rel="stylesheet".*?>/g, '');
html = html.replace(
  '</head>',
  '  <link rel="stylesheet" href="./index.css" />\n</head>',
);

// Replace module script source
html = html.replace('src="./frontend.tsx"', `src="./${jsFile}"`);

await Bun.write('./dist/index.html', html);
await Bun.write('./dist/404.html', html); // For GitHub Pages SPA

// Copy static assets
console.log('Copying assets...');
await $`cp ./src/web/entry/mockServiceWorker.js ./dist/`;

console.log('Build complete!');
