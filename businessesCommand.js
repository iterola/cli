/* Copyright 2025 Iterola LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import commander from 'commander'

import __module1 from './formatOutput.js'
import api from './request.js'

const { dim, bold, cyan } = __module1

// API keys keep businesses read-only because there is no businesses:write
// scope. Browser sessions may update tenant branding through the same
// access-token-only route used by the app.
function businessesCommand() {
  const command = new commander.Command('businesses')
  command.description('read and update the businesses of your organization')

  withJson(
    command
      .command('list')
      .description('list businesses (GET /api/businesses)'),
  ).action(async options => {
    try {
      const businesses = await api.get('/api/businesses')

      if (options.json) {
        printJson(businesses)
        return
      }

      if (businesses.length === 0) {
        console.log('No businesses found')
        return
      }

      console.log(`Found ${businesses.length} business(es):`)
      businesses.forEach((business, index) => {
        const apps = business.enabledApps?.length
          ? ` [${business.enabledApps.join(', ')}]`
          : ''
        console.log(
          `${index + 1}. ${business.name || business._id}${apps}` +
            ` (${business._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <businessId>')
      .description(
        'raw JSON for one business (GET /api/businesses/:businessId)',
      ),
  ).action(async (businessId, options) => {
    try {
      const business = await api.get(`/api/businesses/${businessId}`)
      printJson(business)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <businessId>')
      .description('read one business formatted for the terminal'),
  ).action(async (businessId, options) => {
    try {
      const business = await api.get(`/api/businesses/${businessId}`)
      if (options.json) {
        printJson(business)
        return
      }
      if (!business) {
        console.log('Business not found')
        return
      }
      console.log()
      console.log(bold(business.name || business._id))
      console.log(dim(business._id))
      console.log()
      if (business.status) {
        console.log(`${cyan('status')}  ${business.status}`)
      }
      if (business.enabledApps?.length) {
        console.log(`${cyan('apps')}  ${business.enabledApps.join(', ')}`)
      }
      if (business.currency) {
        console.log(`${cyan('currency')}  ${business.currency}`)
      }
      if (business.defaultLocale) {
        console.log(`${cyan('locale')}  ${business.defaultLocale}`)
      }
      if (business.creationTime) {
        console.log(`${cyan('created')}  ${business.creationTime}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <businessId>')
      .description('update a business through an authenticated browser session')
      .option('--primary-color <hex>', 'set the primary brand color')
      .option('--secondary-color <hex>', 'set the secondary brand color'),
  ).action(async (businessId, options) => {
    try {
      if (
        options.primaryColor === undefined &&
        options.secondaryColor === undefined
      ) {
        fail(
          new Error(
            'No updates specified. Use --primary-color or --secondary-color.',
          ),
          { json: options.json },
        )
        return
      }

      const business = await api.get(`/api/businesses/${businessId}`)
      const updated = {
        ...business,
        ...(options.primaryColor === undefined
          ? {}
          : { primaryColor: options.primaryColor }),
        ...(options.secondaryColor === undefined
          ? {}
          : { secondaryColor: options.secondaryColor }),
      }
      const result = await api.put(`/api/businesses/${businessId}`, updated)

      if (options.json) {
        printJson({ ok: true, id: result._id || businessId })
      } else {
        console.log(`Updated ${result.name || business.name || businessId}`)
      }
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  return command
}

export default businessesCommand
