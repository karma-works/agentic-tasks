const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['.opencode/plugin/tasks_ai.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/tasks_ai.js',
  external: ['fs', 'path', 'os', 'util', 'events', 'child_process', 'crypto'],
  format: 'cjs',
  sourcemap: true,
}).then(() => {
    console.log('Build complete: dist/tasks_ai.js');
}).catch((e) => {
    console.error(e);
    process.exit(1)
});
