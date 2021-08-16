const webpackConfig = require('./webpack.config');

module.exports = {
  ...webpackConfig,
  mode: 'development',
  watch: true,
};