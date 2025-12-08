const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  if (env.mode === 'development') {
    config.devServer = {
      ...(config.devServer || {}),
      proxy: {
        '/api': {
          target: 'https://esteh-backend-production.up.railway.app',
          changeOrigin: true,
          secure: true,
        },
      },
    };
  }
  return config;
};
