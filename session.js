/* Copyright 2025 Iterola LLC */
const createSessionStore = require('@monorepool/agentfirst/sessionStore.js')

// ~/.iterola/ with the same key names the CLI has always written, so a
// previously stored apiKeySecret keeps working unchanged; browser logins
// store accessToken + refreshToken alongside it. The directory is only
// created on first use — `iterola --help` leaves nothing behind.
module.exports = createSessionStore({ productDirName: 'iterola' })
