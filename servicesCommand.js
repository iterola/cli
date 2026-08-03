/* Copyright 2025 Iterola LLC */
const commander = require('commander')
const {
  printJson,
  withJson,
  fail,
} = require('@monorepool/agentfirst/output.js')
const buildQuery = require('./buildQuery.js')
const parseBody = require('./parseBody.js')
const api = require('./request.js')
const resolveBusinessId = require('./resolveBusinessId.js')
const { dim, bold, cyan } = require('./formatOutput.js')

function servicesCommand() {
  const command = new commander.Command('services')
  command.description(
    'manage the services of your organization (services:read / services:write)',
  )

  withJson(
    command
      .command('list')
      .description('list services (GET /api/services)')
      .option('--businessId <businessId>', 'only services of this business')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
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
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <serviceId>')
      .description('raw JSON for one service (GET /api/services/:serviceId)'),
  ).action(async (serviceId, options) => {
    try {
      const service = await api.get(`/api/services/${serviceId}`)
      printJson(service)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <serviceId>')
      .description('read one service formatted for the terminal'),
  ).action(async (serviceId, options) => {
    try {
      const service = await api.get(`/api/services/${serviceId}`)
      if (options.json) {
        printJson(service)
        return
      }
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
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description(
        'create a service (POST /api/services, fires service.created)',
      )
      .requiredOption('--name <name>', 'service name')
      .option(
        '--businessId <businessId>',
        'business the service belongs to (required unless the key is locked to one business)',
      )
      .option('--price <price>', 'price in the business currency')
      .option('--duration <duration>', 'duration in minutes')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
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
      if (options.json) {
        printJson({ ok: true, id: service._id })
        return
      }
      printJson(service)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <serviceId>')
      .description(
        'update a service (PUT /api/services/:serviceId, fires service.updated)',
      )
      .option('--name <name>', 'service name')
      .option('--price <price>', 'price in the business currency')
      .option('--duration <duration>', 'duration in minutes')
      .option('--businessId <businessId>', 'business the service belongs to')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (serviceId, options) => {
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
      if (options.json) {
        printJson({ ok: true, id: service._id })
        return
      }
      printJson(service)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <serviceId...>')
      .description(
        'delete one or more services by id (DELETE /api/services/:serviceId)',
      ),
  ).action(async (serviceIds, options) => {
    const deleted = []
    for (let index = 0; index < serviceIds.length; index += 1) {
      const serviceId = serviceIds[index]
      try {
        await api.del(`/api/services/${serviceId}`)
        deleted.push(serviceId)
        if (!options.json) {
          console.log(`deleted ${serviceId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === serviceIds.length, deleted })
    }
  })

  return command
}

module.exports = servicesCommand
