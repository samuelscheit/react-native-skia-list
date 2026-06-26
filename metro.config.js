// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const babelRuntimeHelper = moduleName.match(/^@babel\/runtime\/helpers\/(?!esm\/)(.+)$/);
  if (babelRuntimeHelper) {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'node_modules', '@babel', 'runtime', 'helpers', `${babelRuntimeHelper[1]}.js`),
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
