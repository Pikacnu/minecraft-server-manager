type ProcessPolyfill = {
  env: Record<string, string | undefined>;
};

const globalWithProcess = globalThis as typeof globalThis & {
  process?: ProcessPolyfill;
};

if (typeof globalWithProcess.process === 'undefined') {
  globalWithProcess.process = {
    env: {},
  } as unknown as NodeJS.Process;
}
export {};
