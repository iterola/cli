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

function appointmentsCommand() {
  const command = new commander.Command('appointments')
  command.description(
    'manage the appointments of your organization' +
      ' (appointments:read / appointments:write)',
  )

  withJson(
    command
      .command('list')
      .description('list appointments (GET /api/appointments)')
      .option('--businessId <businessId>', 'only appointments of this business')
      .option('--clientId <clientId>', 'only appointments of this client')
      .option(
        '--startTime <startTime>',
        'only appointments starting at or after this ISO time',
      )
      .option(
        '--endTime <endTime>',
        'only appointments ending before this ISO time',
      )
      .option('-n, --limit <limit>', 'max results', '25')
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'sort by this field, e.g. startTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const appointments = await api.get(
        `/api/appointments${buildQuery({
          businessId: options.businessId,
          clientId: options.clientId,
          startTime: options.startTime,
          endTime: options.endTime,
          limit: options.limit,
          skip: options.skip,
          sortField: options.sortField,
          sortDirection: options.sortDirection,
          fields: options.fields,
        })}`,
      )

      if (options.json) {
        printJson(appointments)
        return
      }

      if (appointments.length === 0) {
        console.log('No appointments found')
        return
      }

      console.log(`Found ${appointments.length} appointment(s):`)
      appointments.forEach((appointment, index) => {
        const details = [
          appointment.startTime,
          appointment.status,
          appointment.clientId ? `client ${appointment.clientId}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
        console.log(`${index + 1}. ${details} (${appointment._id})`)
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <appointmentId>')
      .description(
        'raw JSON for one appointment (GET /api/appointments/:appointmentId)',
      ),
  ).action(async (appointmentId, options) => {
    try {
      const appointment = await api.get(`/api/appointments/${appointmentId}`)
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <appointmentId>')
      .description('read one appointment formatted for the terminal'),
  ).action(async (appointmentId, options) => {
    try {
      const appointment = await api.get(`/api/appointments/${appointmentId}`)
      if (options.json) {
        printJson(appointment)
        return
      }
      if (!appointment) {
        console.log('Appointment not found')
        return
      }
      console.log()
      console.log(bold(`Appointment ${appointment._id}`))
      console.log(dim(appointment._id))
      console.log()
      if (appointment.status) {
        console.log(`${cyan('status')}  ${appointment.status}`)
      }
      if (appointment.startTime) {
        console.log(`${cyan('start')}  ${appointment.startTime}`)
      }
      if (appointment.endTime) {
        console.log(`${cyan('end')}  ${appointment.endTime}`)
      }
      if (appointment.clientId) {
        console.log(`${cyan('clientId')}  ${appointment.clientId}`)
      }
      if (appointment.businessId) {
        console.log(`${cyan('businessId')}  ${appointment.businessId}`)
      }
      if (appointment.services?.length) {
        console.log(
          `${cyan('services')}  ${appointment.services
            .map(service => service.name || service._id || service)
            .join(', ')}`,
        )
      }
      if (appointment.note) {
        console.log(`${cyan('note')}  ${appointment.note}`)
      }
      if (appointment.creationTime) {
        console.log(`${cyan('created')}  ${appointment.creationTime}`)
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
        'create an appointment (POST /api/appointments,' +
          ' fires appointment.created)',
      )
      .requiredOption(
        '--startTime <startTime>',
        'ISO start time, e.g. 2026-08-10T14:00:00.000Z',
      )
      .option('--endTime <endTime>', 'ISO end time')
      .option(
        '--businessId <businessId>',
        'business the appointment belongs to (required unless the key is locked to one business)',
      )
      .option('--clientId <clientId>', 'client the appointment is for')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const appointment = await api.post('/api/appointments', {
        ...body,
        startTime: options.startTime,
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.businessId && { businessId: options.businessId }),
        ...(options.clientId && { clientId: options.clientId }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: appointment._id })
        return
      }
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <appointmentId>')
      .description(
        'update an appointment (PUT /api/appointments/:appointmentId,' +
          ' fires appointment.updated)',
      )
      .option('--startTime <startTime>', 'ISO start time')
      .option('--endTime <endTime>', 'ISO end time')
      .option(
        '--status <status>',
        'SCHEDULED, CLIENT_ARRIVED, NO_SHOW or CANCELED',
      )
      .option('--clientId <clientId>', 'client the appointment is for')
      .option('--note <note>', 'free-text note')
      .option('--businessId <businessId>', 'business the appointment belongs to')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (appointmentId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const businessId = await resolveBusinessId(options, body, () =>
        api.get(`/api/appointments/${appointmentId}`),
      )
      const appointment = await api.put(`/api/appointments/${appointmentId}`, {
        ...body,
        _id: appointmentId,
        ...(businessId && { businessId }),
        ...(options.startTime && { startTime: options.startTime }),
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.status && { status: options.status }),
        ...(options.clientId && { clientId: options.clientId }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: appointment._id })
        return
      }
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <appointmentId...>')
      .description(
        'delete one or more appointments by id' +
          ' (DELETE /api/appointments/:appointmentId, fires appointment.deleted)',
      ),
  ).action(async (appointmentIds, options) => {
    const deleted = []
    for (let index = 0; index < appointmentIds.length; index += 1) {
      const appointmentId = appointmentIds[index]
      try {
        await api.del(`/api/appointments/${appointmentId}`)
        deleted.push(appointmentId)
        if (!options.json) {
          console.log(`deleted ${appointmentId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === appointmentIds.length, deleted })
    }
  })

  return command
}

module.exports = appointmentsCommand
