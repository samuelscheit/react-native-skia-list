const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const appDirectory = path.resolve(__dirname);
const { presets, plugins } = require(`${appDirectory}/babel.config.js`);
const compileNodeModules = [
  // Add every react-native package that needs compiling
  // 'react-native-gesture-handler',
  "@shopify/react-native-skia",
  "react-native-reanimated",
  "react-native",
].map((moduleName) => path.resolve(appDirectory, `node_modules/${moduleName}`));
const { sources } = require("webpack");
const fs = require("fs");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/, // Updated to include .jsx
  // Add every directory that needs to be compiled by Babel during the build.
  include: [
    path.resolve(__dirname, "index.web.js"), // Entry to your application
    path.resolve(__dirname, "App.tsx"), // Updated to .jsx
    path.resolve(__dirname, "src"),
    path.resolve(__dirname, "component"),
    ...compileNodeModules,
  ],
  use: {
    loader: "babel-loader",
    options: {
      cacheDirectory: true,
      presets,
      plugins,
    },
  },
};

const svgLoaderConfiguration = {
  test: /\.svg$/,
  use: [
    {
      loader: "@svgr/webpack",
    },
  ],
};

const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  use: {
    loader: "url-loader",
    options: {
      name: "[name].[ext]",
    },
  },
};

const tsLoaderConfiguration = {
  test: /\.(ts)x?$/,
  exclude: /node_modules|\.d\.ts$/, // this line as well
  use: {
    loader: 'ts-loader',
    options: {
      // compilerOptions: {
      //   noEmit: false, // this option will solve the issue
      // },
      transpileOnly: true
    },
  },
};

module.exports = {
  entry: {
    app: path.join(__dirname, "index.web.js"),
  },
  output: {
    path: path.resolve(appDirectory, "dist"),
    publicPath: "/",
    filename: "rnw.bundle.js",
  },
  resolve: {
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".web.js", ".js"],
    alias: {
      "react-native$": "react-native-web",
    },
  },
  ignoreWarnings: [()=>true],
  mode: "development",
  module: {
    rules: [
      babelLoaderConfiguration,
      imageLoaderConfiguration,
      svgLoaderConfiguration,
      tsLoaderConfiguration,
    ],
  },
  devServer: {
    port: 3000,
  },
  plugins: [
    new (class CopySkiaPlugin {
      apply(compiler) {
        compiler.hooks.thisCompilation.tap("AddSkiaPlugin", (compilation) => {
          compilation.hooks.processAssets.tapPromise(
            {
              name: "copy-skia",
              stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            },
            async () => {
              const src = require.resolve("canvaskit-wasm/bin/full/canvaskit.wasm");
              if (!compilation.getAsset(src)) {
                compilation.emitAsset("/canvaskit.wasm", new sources.RawSource(await fs.promises.readFile(src)));
              }
            }
          );
        });
      }
    })(),
    new NodePolyfillPlugin(),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "web", "index.html"),
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
    }),
  ],
};
