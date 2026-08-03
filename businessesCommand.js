/* Copyright 2025 Iterola LLC */
const commander = require('commander')
const {
  printJson,
  withJson,
  fail,
} = require('@monorepool/agentfirst/output.js')
const api = require('./request.js')
const { dim, bold, cyan } = require('./formatOutput.js')

// Businesses are read-only through the public API by design: a business is
// the per-tenant container created at signup, so there is no businesses:write
// scope.
function businessesCommand() {
  const command = new commander.Command('businesses')
  command.description(
    'read the businesses of your organization (read-only, businesses:read)',
  )

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

  return command
}

module.exports = businessesCommand
