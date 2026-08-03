/* Copyright 2025 Iterola LLC */
const localStorage = require('./localStorage.js')

module.exports = function getApiKeySecret() {
  return localStorage.getItem('apiKeySecret')
}
