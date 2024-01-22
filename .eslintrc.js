module.exports = {
  extends: '@mate-academy/eslint-config',
  env: {
    jest: true,
    es2021: true,
  },
  rules: {
    'no-proto': 0
  },
  plugins: ['jest']
};
