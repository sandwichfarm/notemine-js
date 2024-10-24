import esbuild from 'esbuild';
import { clean } from 'esbuild-plugin-clean';
import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { livereloadPlugin } from '@jgoz/esbuild-plugin-livereload';
import esbuildPluginTsc from 'esbuild-plugin-tsc';
import getPort from 'get-port';

const production = process.env.NODE_ENV === 'production';

export async function buildWithWatch() {
  const watch = !production;
  const livereloadPort = await getPort({ port: 53100 });

  const commonPlugins = [
    clean({
      patterns: ['./dist'],
    }),
    esbuildPluginTsc({
      force: true,
    }),
    polyfillNode({
      polyfills: {
        module: true,
      },
    }),
    !production &&
      livereloadPlugin({
        port: livereloadPort,
        watch: 'dist',
      }),
  ].filter(Boolean);

  const mainBuildOptions = {
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: ['esnext'],
    sourcemap: true,
    minify: production,
    plugins: commonPlugins,
    loader: {
      '.ts': 'ts',
      '.js': 'js',
    },
  };

  try {
    if (watch) {
      const mainContext = await esbuild.context(mainBuildOptions);
      await mainContext.watch();
    } else {
      await esbuild.build(mainBuildOptions);
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildWithWatch();
