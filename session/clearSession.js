/* Copyright 2025 Iterola LLC */
const localStorage = require('./localStorage.js')

module.exports = function clearSession() {
  localStorage.clear()
}
