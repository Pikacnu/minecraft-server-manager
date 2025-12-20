import { autoImports, type AutoImportsOptions } from 'bun-plugin-auto-imports';

const options: AutoImportsOptions = {
  dirs: ['./src/utils', './src/deployment'],
  dts: `./src/auto-import.d.ts`, // default is `./auto-import.d.ts`
};

export const autoImportPlugin = autoImports(options);
export default autoImportPlugin;
