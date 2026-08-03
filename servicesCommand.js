/* Copyright 2025 Iterola LLC */
const commander = require('commander')
const buildQuery = require('./buildQuery.js')
const parseBody = require('./parseBody.js')
const api = require('./request.js')
const resolveBusinessId = require('./resolveBusinessId.js')
const { printJson, dim, bold, cyan } = require('./formatOutput.js')

function servicesCommand() {
  const command = new commander.Command('services')
  command.description(
    'manage the services of your organization (services:read / services:write)',
  )

  command
    .command('list')
    .description('list services (GET /api/services)')
    .option('--businessId <businessId>', 'only services of this business')
    .option('--fields <fields>', 'comma-separated projection of fields')
    .option('--json', 'print raw JSON response')
    .action(async options => {
      try {
        const services = await api.get(
          `/api/services${buildQuery({
            businessId: options.businessId,
            fields: options.fields,
          })}`,
        )

        if (options.json) {
          printJson(services)
          return
        }

        if (services.length === 0) {
          console.log('No services found')
          return
        }

        console.log(`Found ${services.length} service(s):`)
        services.forEach((service, index) => {
          const details = [
            service.price !== undefined ? `price ${service.price}` : null,
            service.duration ? `${service.duration} min` : null,
          ]
            .filter(Boolean)
            .join(' · ')
          console.log(
            `${index + 1}. ${service.name || service._id}` +
              `${details ? ` — ${details}` : ''} (${service._id})`,
          )
        })
      } catch (error) {
        console.error('error', error.message)
        process.exitCode = 1
      }
    })

  command
    .command('get <serviceId>')
    .description('raw JSON for one service (GET /api/services/:serviceId)')
    .action(async serviceId => {
      try {
        const service = await api.get(`/api/services/${serviceId}`)
        printJson(service)
      } catch (error) {
        console.error('error', error.message)
        process.exitCode = 1
      }
    })

  command
    .command('read <serviceId>')
    .description('read one service formatted for the terminal')
    .action(async serviceId => {
      try {
        const service = await api.get(`/api/services/${serviceId}`)
        if (!service) {
          console.log('Service not found')
          return
        }
        console.log()
        console.log(bold(service.name || service._id))
        console.log(dim(service._id))
        console.log()
        if (service.price !== undefined) {
          console.log(`${cyan('price')}  ${service.price}`)
        }
        if (service.duration) {
          console.log(`${cyan('duration')}  ${service.duration} min`)
        }
        if (service.businessId) {
          console.log(`${cyan('businessId')}  ${service.businessId}`)
        }
        if (service.creationTime) {
          console.log(`${cyan('created')}  ${service.creationTime}`)
        }
        console.log()
      } catch (error) {
        console.error('error', error.message)
        process.exitCode = 1
      }
    })

  command
    .command('add')
    .description('create a service (POST /api/services, fires service.created)')
    .requiredOption('--name <name>', 'service name')
    .option(
      '--businessId <businessId>',
      'business the service belongs to (required unless the key is locked to one business)',
    )
    .option('--price <price>', 'price in the business currency')
    .option('--duration <duration>', 'duration in minutes')
    .option('--body <json>', 'extra JSON fields merged into the request body')
    .action(async options => {
      try {
        const body = options.body ? parseBody(options.body) : {}
        const service = await api.post('/api/services', {
          ...body,
          name: options.name,
          ...(options.businessId && { businessId: options.businessId }),
          ...(options.price !== undefined && {
            price: parseFloat(options.price),
          }),
          ...(options.duration !== undefined && {
            duration: parseInt(options.duration, 10),
          }),
        })
        printJson(service)
      } catch (error) {
        console.error('error', error.message)
        process.exitCode = 1
      }
    })

  command
    .command('update <serviceId>')
    .description('update a service (PUT /api/services/:serviceId, fires service.updated)')
    .option('--name <name>', 'service name')
    .option('--price <price>', 'price in the business currency')
    .option('--duration <duration>', 'duration in minutes')
    .option('--businessId <businessId>', 'business the service belongs to')
    .option('--body <json>', 'extra JSON fields merged into the request body')
    .action(async (serviceId, options) => {
      try {
        const body = options.body ? parseBody(options.body) : {}
        const businessId = await resolveBusinessId(options, body, () =>
          api.get(`/api/services/${serviceId}`),
        )
        const service = await api.put(`/api/services/${serviceId}`, {
          ...body,
          _id: serviceId,
          ...(businessId && { businessId }),
          ...(options.name && { name: options.name }),
          ...(options.price !== undefined && {
            price: parseFloat(options.price),
          }),
          ...(options.duration !== undefined && {
            duration: parseInt(options.duration, 10),
          }),
        })
        printJson(service)
      } catch (error) {
        console.error('error', error.message)
        process.exitCode = 1
      }
    })

  command
    .command('delete <serviceId...>')
    .description('delete one or more services by id (DELETE /api/services/:serviceId)')
    .action(async serviceIds => {
      for (let index = 0; index < serviceIds.length; index += 1) {
        const serviceId = serviceIds[index]
        try {
          await api.del(`/api/services/${serviceId}`)
          console.log(`deleted ${serviceId}`)
        } catch (error) {
          console.error('error', error.message)
          process.exitCode = 1
        }
      }
    })

  return command
}

module.exports = servicesCommand
