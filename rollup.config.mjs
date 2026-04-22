import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const external = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'vue',
  '@angular/core',
  '@angular/common',
  'rxjs',
];

const tsPlugin = (options = {}) =>
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false,
    sourceMap: true,
    ...options,
  });

function bundle({ input, outDir, umdName = null }) {
  const outputs = [
    {
      file: `${outDir}/index.mjs`,
      format: 'es',
      sourcemap: true,
    },
    {
      file: `${outDir}/index.cjs`,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
  ];

  if (umdName) {
    outputs.push({
      file: `${outDir}/index.umd.js`,
      format: 'umd',
      name: umdName,
      sourcemap: true,
      exports: 'named',
    });
  }

  return {
    input,
    external,
    output: outputs,
    plugins: [nodeResolve(), tsPlugin()],
  };
}

function dtsBundle({ input, outFile }) {
  return {
    input,
    external,
    output: { file: outFile, format: 'es' },
    plugins: [dts()],
  };
}

export default [
  // Core entry (dist/index.*)
  bundle({ input: 'src/index.ts', outDir: 'dist' }),
  dtsBundle({ input: 'src/index.ts', outFile: 'dist/index.d.ts' }),

  // UMD — vanilla-friendly global
  {
    input: 'src/umd.ts',
    external,
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'RazorpayUniversal',
      sourcemap: true,
      exports: 'named',
    },
    plugins: [nodeResolve(), tsPlugin()],
  },

  // React adapter
  bundle({
    input: 'src/adapters/react/index.ts',
    outDir: 'dist/adapters/react',
  }),
  dtsBundle({
    input: 'src/adapters/react/index.ts',
    outFile: 'dist/adapters/react/index.d.ts',
  }),

  // Vue adapter
  bundle({
    input: 'src/adapters/vue/index.ts',
    outDir: 'dist/adapters/vue',
  }),
  dtsBundle({
    input: 'src/adapters/vue/index.ts',
    outFile: 'dist/adapters/vue/index.d.ts',
  }),

  // Angular adapter
  bundle({
    input: 'src/adapters/angular/index.ts',
    outDir: 'dist/adapters/angular',
  }),
  dtsBundle({
    input: 'src/adapters/angular/index.ts',
    outFile: 'dist/adapters/angular/index.d.ts',
  }),

  // Vanilla adapter
  bundle({
    input: 'src/adapters/vanilla/index.ts',
    outDir: 'dist/adapters/vanilla',
  }),
  dtsBundle({
    input: 'src/adapters/vanilla/index.ts',
    outFile: 'dist/adapters/vanilla/index.d.ts',
  }),
];
