/* Copyright 2025 Iterola LLC */
const signupCommand = require('@monorepool/agentfirst/signupCommand.js')
const getApiUrl = require('./getApiUrl.js')
const session = require('./session.js')
const { binaryName, appUrl } = require('./constants.js')

// The step that used to need a person. `login` assumes the account already
// exists; an agent pointed at iterola.com for the first time has nothing to
// log into, and the browser flow it fell back to blocked with nobody there
// to complete it.
//
//   iterola signup --email founder@example.com --json
//
// drives the same public POST /api/signup the web signup form posts to, then
// stores the session in the same ~/.iterola/ the browser login writes — so
// every other command works immediately afterwards.
module.exports = () =>
  signupCommand({ binaryName, getApiUrl, appUrl, session })
