/* Copyright 2025 Iterola LLC */
const localStorage = require('./localStorage.js')

module.exports = function setApiKeySecret(apiKeySecret) {
  return localStorage.setItem('apiKeySecret', apiKeySecret)
}
