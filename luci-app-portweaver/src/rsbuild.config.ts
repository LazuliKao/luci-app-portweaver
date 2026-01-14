import { defineConfig } from '@rsbuild/core';
import { rspack } from '@rsbuild/core';

// LuCI require statements that must be at the very top of the output file
const luciRequires = `'use strict';
'require view';
'require form';
'require uci';
'require firewall as fwmodel';
'require tools.widgets as widgets';
'require rpc';
'require poll';
'require ui';

`;

export default defineConfig({
  source: {
    entry: {
      config: './main.ts',
    },
  },
  output: {
    distPath: {
      root: '../htdocs/luci-static/resources/view/portweaver',
      js: '.',
    },
    filename: {
      js: '[name].js',
    },
    assetPrefix: '',
    minify: false,
    cleanDistPath: true,
  },
  plugins: [],
  tools: {
    htmlPlugin: false,
    rspack: (config) => {
      // Configure output for LuCI: simple return statement at module level
      config.output = config.output || {};
      config.output.iife = false; // No IIFE wrapper
      config.output.module = false;

      config.optimization = config.optimization || {};
      config.optimization.splitChunks = false;
      config.optimization.runtimeChunk = false;
      config.optimization.minimize = false;

      // Use BannerPlugin to inject LuCI requires at the very top
      config.plugins = config.plugins || [];
      config.plugins.push(
        new rspack.BannerPlugin({
          banner: luciRequires,
          raw: true,
          entryOnly: true,
        })
      );
      config.plugins.push(new rspack.BannerPlugin({
        banner: "return viewModule;",
        raw: true,
        entryOnly: true,
        footer: true,
      }))
      return config;
    },
  },
  performance: {
    chunkSplit: {
      strategy: 'all-in-one',
    },
  },
});
