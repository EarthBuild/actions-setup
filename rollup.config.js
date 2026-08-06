import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

const external = ['node:fs/promises', 'os', 'path', 'fs'];

const basePlugins = [
  resolve({ preferBuiltins: true }),
  commonjs(),
  json(),
];

export default [
  {
    input: 'src/setup.ts',
    output: {
      dir: 'dist/setup',
      entryFileNames: 'index.js',
      format: 'es',
      sourcemap: true,
    },
    external,
    plugins: [
      ...basePlugins,
      typescript({ tsconfig: './tsconfig.json', outDir: 'dist/setup' }),
      terser(),
    ],
  },
  {
    input: 'src/cache-save.ts',
    output: {
      dir: 'dist/cache-save',
      entryFileNames: 'index.js',
      format: 'es',
      sourcemap: true,
    },
    external,
    plugins: [
      ...basePlugins,
      typescript({ tsconfig: './tsconfig.json', outDir: 'dist/cache-save' }),
      terser(),
    ],
  },
];
