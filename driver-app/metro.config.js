const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro 配置 - React Native 打包
 * https://reactnative.dev/docs/metro
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
