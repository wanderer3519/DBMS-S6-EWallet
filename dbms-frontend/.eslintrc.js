module.exports = {
  extends: ['react-app'],
  rules: {
    'react-hooks/exhaustive-deps': 'off',
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
  }
}; 