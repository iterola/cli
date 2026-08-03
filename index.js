#!/usr/bin/env node
/* Copyright 2025 Iterola LLC */
const program = require('commander')
const skillsCommand = require('@monorepool/agentfirst/skillsCommand.js')
const appointmentsCommand = require('./appointmentsCommand.js')
const businessesCommand = require('./businessesCommand.js')
const clientsCommand = require('./clientsCommand.js')
const loginCommand = require('./loginCommand.js')
const logoutCommand = require('./logoutCommand.js')
const schemaCommand = require('./schemaCommand.js')
const servicesCommand = require('./servicesCommand.js')
const packageJson = require('./package.json')

program
  .name('iterola')
  .description(
    'iterola cli — manage the clients, services and appointments' +
      ' of your business from the terminal',
  )
  .version(packageJson.version)
  .addCommand(loginCommand())
  .addCommand(logoutCommand())
  .addCommand(businessesCommand())
  .addCommand(clientsCommand())
  .addCommand(servicesCommand())
  .addCommand(appointmentsCommand())
  // baseDirectory must be this file's directory: the shared factory resolves
  // the bundled skills/ relative to it (dist/index.js → ../skills).
  .addCommand(skillsCommand({ baseDirectory: __dirname }))

// `schema` describes the assembled program, itself included, so it is added
// after every other command is registered and before parsing.
program.addCommand(schemaCommand(program))
program.parse(process.argv)
