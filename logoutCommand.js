/* Copyright 2025 Iterola LLC */
const commander = require('commander')
const clearSession = require('./session/clearSession.js')

function logoutCommand() {
  const command = new commander.Command('logout')
  command.description('clear the API key secret stored in ~/.iterola/')
  command.action(() => {
    try {
      clearSession()
      console.log('logged out')
    } catch (error) {
      console.error('error', error.message)
      process.exitCode = 1
    }
  })

  return command
}

module.exports = logoutCommand
