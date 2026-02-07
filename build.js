const esbuild = require('esbuild');

Promise.all([
  esbuild.build({
    entryPoints: ['.opencode/plugin/tasks_ai.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/tasks_ai.js',
    external: ['fs', 'path', 'os', 'util', 'events', 'child_process', 'crypto'],
    format: 'cjs',
    sourcemap: true,
  }),
  esbuild.build({
    entryPoints: ['src/cli.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/cli.js',
    external: ['fs', 'path', 'os', 'util', 'events', 'child_process', 'crypto'],
    format: 'cjs',
    sourcemap: true,
  })
]).then(() => {
    console.log('Build complete: dist/tasks_ai.js and dist/cli.js');
}).catch((e) => {
    console.error(e);
    process.exit(1)
});
