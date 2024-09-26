import path from 'path';
import { fileURLToPath } from 'url';
import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import copy from 'rollup-plugin-copy';
import wasm from '@rollup/plugin-wasm';
import OMT from '@surma/rollup-plugin-off-main-thread';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const plugins = [
  resolve({
    extensions: ['.ts', '.js', '.json', '.wasm'],
    browser: true,
    preferBuiltins: false,
  }),
  replace({
    'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
    preventAssignment: true,
  }),
  typescript({
    tsconfig: './tsconfig.json',
    clean: true,
  }),
  commonjs(),
  wasm(),
  OMT(),
];

export default [
  // IIFE build configuration
  {
    input: './src/index.ts',
    output: {
      dir: './dist/iife/',
      format: 'iife',
      name: 'Notemine',
      sourcemap: true,
    },
    external: ['rxjs', 'nostr-tools', 'wasm/notemine.js'],
    plugins: [
      ...plugins,
      copy({
        targets: [{ src: 'src/wasm/*', dest: 'dist/iife/wasm' }],
      }),
      production && terser(),
    ],
  },
  // ESM build configuration
  {
    input: './src/index.ts',
    output: {
      dir: './dist/next/',
      format: 'es',
      sourcemap: true,
    },
    external: ['rxjs', 'nostr-tools', 'wasm/notemine.js'],
    plugins: [
      ...plugins,
      copy({
        targets: [{ src: 'src/wasm/*', dest: 'dist/next/wasm' }],
      }),
      production && terser(),
    ],
  },
];
