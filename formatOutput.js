/* Copyright 2025 Iterola LLC */
const { inspect } = require('node:util')

function formatJson(value) {
  return inspect(value, { colors: true, depth: null })
}

function printJson(value) {
  console.log(formatJson(value))
}

const dim = text => `\x1b[2m${text}\x1b[0m`
const bold = text => `\x1b[1m${text}\x1b[0m`
const cyan = text => `\x1b[36m${text}\x1b[0m`

module.exports = { formatJson, printJson, dim, bold, cyan }
