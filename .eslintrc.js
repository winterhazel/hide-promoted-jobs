module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
  },
  extends: ['airbnb-base', 'prettier'],
  overrides: [
    {
      files: ['scripts/**/*.js'],
      env: { node: true },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-use-before-define': [
      'error',
      { functions: false, classes: true, variables: true },
    ],
  },
};
