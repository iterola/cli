#!/usr/bin/env node
/* Copyright 2025 Iterola LLC */

import { existsSync, realpathSync } from 'node:fs'
import { fileURLToPath as __fileURLToPath, pathToFileURL } from 'node:url'

import skillsCommand from '@monorepool/agentfirst/skillsCommand.js'
import program from 'commander'

import appointmentsCommand from './appointmentsCommand.js'
import businessesCommand from './businessesCommand.js'
import clientsCommand from './clientsCommand.js'
import loginCommand from './loginCommand.js'
import logoutCommand from './logoutCommand.js'
import packageJson from './package.json' with { type: 'json' }
import schemaCommand from './schemaCommand.js'
import servicesCommand from './servicesCommand.js'
import signupCommand from './signupCommand.js'

program
  .name('iterola')
  .description(
    'iterola cli — manage the clients, services and appointments' +
      ' of your business from the terminal',
  )
  .version(packageJson.version)
  .addCommand(signupCommand())
  .addCommand(loginCommand())
  .addCommand(logoutCommand())
  .addCommand(businessesCommand())
  .addCommand(clientsCommand())
  .addCommand(servicesCommand())
  .addCommand(appointmentsCommand())
  // baseDirectory must be this file's directory: the shared factory resolves
  // the bundled skills/ relative to it (dist/index.js → ../skills).
  .addCommand(
    skillsCommand({
      baseDirectory: __fileURLToPath(new URL('.', import.meta.url)),
    }),
  )

// `schema` describes the assembled program, itself included, so it is added
// after every other command is registered and before parsing.
program.addCommand(schemaCommand(program))

export default program

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  program.parse(process.argv)
}
