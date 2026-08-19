const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const identitySdk = path.resolve(projectRoot, "../packages/identity-sdk");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [identitySdk];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(projectRoot, "../node_modules"),
];

module.exports = config;
