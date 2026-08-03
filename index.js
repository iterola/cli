#!/usr/bin/env node
/* Copyright 2025 Iterola LLC */
const program = require('commander')
const appointmentsCommand = require('./appointmentsCommand.js')
const businessesCommand = require('./businessesCommand.js')
const clientsCommand = require('./clientsCommand.js')
const loginCommand = require('./loginCommand.js')
const logoutCommand = require('./logoutCommand.js')
const servicesCommand = require('./servicesCommand.js')
const skillsCommand = require('./skillsCommand.js')
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
  .addCommand(skillsCommand())
  .parse(process.argv)
