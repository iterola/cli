/* Copyright 2025 Iterola LLC */

// The per-product configuration every @monorepool/agentfirst factory needs.
//
// ITEROLA_API_KEY is read from the environment at request time; a stored
// login (browser session or pasted key) always wins over it, so a globally
// exported key cannot silently hijack an interactive session.
export default {
  binaryName: 'iterola',
  appUrl: 'https://app.iterola.com',
  envKeyName: 'ITEROLA_API_KEY',
}
