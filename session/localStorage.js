/* Copyright 2025 Iterola LLC */
const os = require('node:os')
const path = require('node:path')
const { LocalStorage } = require('node-localstorage')

let localStorage

if (!localStorage) {
  const homeDir = os.homedir()
  localStorage = new LocalStorage(path.resolve(homeDir, '.iterola'))
}

module.exports = localStorage
