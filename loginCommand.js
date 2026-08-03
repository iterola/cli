/* Copyright 2025 Iterola LLC */
const commander = require('commander')
const login = require('./login.js')

function loginCommand() {
  const command = new commander.Command('login')
  command.description(
    'store an Iterola API key secret (prompted, masked) in ~/.iterola/',
  )
  command.action(async () => {
    try {
      await login()
    } catch (error) {
      console.error('error', error.message)
      process.exitCode = 1
    }
  })

  return command
}

module.exports = loginCommand
