/* Copyright 2025 Iterola LLC */
const inquirer = require('inquirer')
const api = require('./request.js')
const clearSession = require('./session/clearSession.js')
const setApiKeySecret = require('./session/setApiKeySecret.js')

// Prompts for the API key secret with a masked inquirer input — the secret is
// never accepted as a CLI argument (it would land in shell history and
// process lists) and never echoed back. It is stored only in ~/.iterola/.
async function login() {
  const { secret } = await inquirer.prompt([
    {
      type: 'password',
      name: 'secret',
      message: 'Iterola API key secret:',
      mask: '*',
    },
  ])

  const trimmed = (secret || '').trim()

  if (!trimmed) {
    throw new Error('no API key secret entered')
  }

  setApiKeySecret(trimmed)

  // Verify the key with the cheapest read the API offers. New keys start
  // with every :read scope, so businesses:read is normally present.
  try {
    const businesses = await api.get('/api/businesses')
    console.log(
      `Logged in — ${businesses.length} business(es) accessible with this key.`,
    )
  } catch (error) {
    if (error.message.includes('Invalid key or secret')) {
      clearSession()
      throw new Error('the API rejected this secret — nothing was stored', {
        cause: error,
      })
    }
    if (error.message.includes('missing the "businesses:read" scope')) {
      console.log(
        'Key stored. It lacks the businesses:read scope, so it could not be' +
          ' verified — commands within its granted scopes will still work.',
      )
      return
    }
    console.log(
      `Key stored, but the verification call failed: ${error.message}`,
    )
  }
}

module.exports = login
