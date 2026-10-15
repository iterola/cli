/* Copyright 2025 Iterola LLC */
import signupCommand from '@monorepool/agentfirst/signupCommand.js'

import __module1 from './constants.js'
import getApiUrl from './getApiUrl.js'
import session from './session.js'

const { binaryName, appUrl } = __module1

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
export default () => signupCommand({ binaryName, getApiUrl, appUrl, session })
