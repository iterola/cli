/* Copyright 2025 Iterola LLC */
import logoutCommand from '@monorepool/agentfirst/logoutCommand.js'

import __module1 from './constants.js'
import session from './session.js'

const { binaryName, envKeyName } = __module1

// Clears everything stored in ~/.iterola/ — the API key secret and any
// browser-login tokens. A key exported as ITEROLA_API_KEY stays in effect;
// the shared factory says so instead of silently staying authenticated.
export default () => logoutCommand({ binaryName, session, envKeyName })
