'use strict';
/** @type {import('@sveltejs/kit').Config} */
import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';
import autoprefixer from 'autoprefixer';

export default {
  extensions: ['.svelte'],
  kit: {
    adapter: adapter({
      assets: 'src/build',
      fallback: null,
      pages: 'src/build',
    }),
    files: {
      appTemplate: 'src/app.html',
      assets: 'static',
      lib: 'src/lib',
      routes: 'src/routes',
      serviceWorker: 'static/service-worker'
    },
    prerender: {},
  },
  preprocess: [
    preprocess({
      defaults: {
        style: 'scss',
      },
      postcss: {
        plugins: [
          autoprefixer()
        ],
      },
      sourceMap: false,
    })
  ],
};
