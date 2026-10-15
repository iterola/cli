/* Copyright 2025 Iterola LLC */

import { fail, printJson } from '@monorepool/agentfirst/output.js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import appointmentsCommand from '../appointmentsCommand.js'
import businessesCommand from '../businessesCommand.js'
import api from '../request.js'
import servicesCommand from '../servicesCommand.js'

vi.mock('../request.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))
vi.mock('@monorepool/agentfirst/output.js', async importOriginal => ({
  ...(await importOriginal()),
  printJson: vi.fn(),
  fail: vi.fn(),
}))

const resources = [
  { name: 'services', create: servicesCommand },
  { name: 'appointments', create: appointmentsCommand },
]
const readResources = [
  ...resources,
  { name: 'businesses', create: businessesCommand },
]
const run = (create, args) =>
  create().exitOverride().parseAsync(args, { from: 'user' })

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

it.each(readResources)(
  'reads $name with get/read and unchanged JSON',
  async ({ name, create }) => {
    const value = { _id: 'record', name: 'Example' }
    api.get.mockResolvedValue(value)
    for (const action of ['get', 'read']) {
      await run(create, [action, 'record', '--json'])
    }
    expect(api.get.mock.calls).toEqual([
      [`/api/${name}/record`],
      [`/api/${name}/record`],
    ])
    expect(printJson.mock.calls).toEqual([[value], [value]])
    expect(console.log).not.toHaveBeenCalled()
  },
)

it.each(readResources)(
  'reports $name read failures without successful output',
  async ({ name, create }) => {
    const error = Object.assign(new Error('synthetic denied read'), {
      status: 403,
    })
    api.get.mockRejectedValue(error)
    await run(create, ['read', 'record', '--json'])
    expect(api.get).toHaveBeenCalledExactlyOnceWith(`/api/${name}/record`)
    expect(fail).toHaveBeenCalledExactlyOnceWith(error, { json: true })
    expect(printJson).not.toHaveBeenCalled()
  },
)

it('lists businesses with their operational app names', async () => {
  const command = businessesCommand()
  expect(command.commands.map(child => child.name())).toEqual([
    'list',
    'get',
    'read',
    'update',
  ])
  api.get.mockResolvedValue([
    { _id: 'one', name: 'Example', enabledApps: ['CRM', 'APPOINTMENTS'] },
    { _id: 'two' },
  ])
  await run(businessesCommand, ['list'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/businesses')
  expect(console.log.mock.calls).toEqual([
    ['Found 2 business(es):'],
    ['1. Example [CRM, APPOINTMENTS] (one)'],
    ['2. two (two)'],
  ])
  expect(api.post).not.toHaveBeenCalled()
  expect(api.put).not.toHaveBeenCalled()
  expect(api.del).not.toHaveBeenCalled()
})

it('updates business branding while preserving the fetched document', async () => {
  api.get.mockResolvedValue({
    _id: 'business',
    name: 'ScannerBrightly',
    enabledApps: ['WEBSITE'],
    note: 'keep',
  })
  api.put.mockResolvedValue({ _id: 'business', name: 'ScannerBrightly' })

  await run(businessesCommand, [
    'update',
    'business',
    '--primary-color',
    '#386FA4',
    '--secondary-color',
    '#FFD60A',
    '--json',
  ])

  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/businesses/business')
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/businesses/business', {
    _id: 'business',
    name: 'ScannerBrightly',
    enabledApps: ['WEBSITE'],
    note: 'keep',
    primaryColor: '#386FA4',
    secondaryColor: '#FFD60A',
  })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({
    ok: true,
    id: 'business',
  })
})

it('sends only service list filters and preserves zero price in human output', async () => {
  api.get.mockResolvedValue([{ _id: 'one', price: 0, duration: 30 }])
  await run(servicesCommand, [
    'list',
    '--businessId',
    'business',
    '--fields',
    'price,duration',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    '/api/services?businessId=business&fields=price%2Cduration',
  )
  expect(console.log.mock.calls).toEqual([
    ['Found 1 service(s):'],
    ['1. one — price 0 · 30 min (one)'],
  ])
})

it('retains all appointment time, scope, pagination and sorting filters', async () => {
  const value = [{ _id: 'one' }]
  api.get.mockResolvedValue(value)
  await run(appointmentsCommand, [
    'list',
    '--businessId',
    'business',
    '--clientId',
    'client',
    '--startTime',
    'start',
    '--endTime',
    'end',
    '--limit',
    '8',
    '--skip',
    '0',
    '--sortField',
    'startTime',
    '--sortDirection',
    'ASC',
    '--fields',
    '_id,startTime',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    '/api/appointments?businessId=business&clientId=client&startTime=start&endTime=end&limit=8&skip=0&sortField=startTime&sortDirection=ASC&fields=_id%2CstartTime',
  )
  expect(printJson).toHaveBeenCalledExactlyOnceWith(value)
})

it('converts explicit service numeric fields including zero and preserves extra body data', async () => {
  api.post.mockResolvedValue({ _id: 'created' })
  await run(servicesCommand, [
    'add',
    '--name',
    'Consultation',
    '--businessId',
    'business',
    '--price',
    '0',
    '--duration',
    '30',
    '--body',
    '{"name":"old","price":99,"note":"keep"}',
    '--json',
  ])
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/services', {
    name: 'Consultation',
    price: 0,
    duration: 30,
    businessId: 'business',
    note: 'keep',
  })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({ ok: true, id: 'created' })
})

it('creates an appointment with explicit fields taking precedence over body data', async () => {
  api.post.mockResolvedValue({ _id: 'created' })
  await run(appointmentsCommand, [
    'add',
    '--startTime',
    'start',
    '--endTime',
    'end',
    '--businessId',
    'business',
    '--clientId',
    'client',
    '--note',
    'explicit',
    '--body',
    '{"startTime":"old","note":"old","services":["service"]}',
    '--json',
  ])
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/appointments', {
    startTime: 'start',
    endTime: 'end',
    businessId: 'business',
    clientId: 'client',
    note: 'explicit',
    services: ['service'],
  })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({ ok: true, id: 'created' })
})

it.each(resources)(
  'pins the $name update ID and resolves the existing business',
  async ({ name, create }) => {
    api.get.mockResolvedValue({ businessId: 'existing' })
    api.put.mockResolvedValue({ _id: 'record' })
    await run(create, [
      'update',
      'record',
      '--body',
      '{"_id":"other","note":"keep"}',
      '--json',
    ])
    expect(api.get).toHaveBeenCalledExactlyOnceWith(`/api/${name}/record`)
    expect(api.put).toHaveBeenCalledExactlyOnceWith(`/api/${name}/record`, {
      _id: 'record',
      businessId: 'existing',
      note: 'keep',
    })
    expect(printJson).toHaveBeenCalledExactlyOnceWith({
      ok: true,
      id: 'record',
    })
  },
)

it('updates zero-valued service fields without an extra business lookup', async () => {
  api.put.mockResolvedValue({ _id: 'record' })
  await run(servicesCommand, [
    'update',
    'record',
    '--businessId',
    'business',
    '--name',
    'Free',
    '--price',
    '0',
    '--duration',
    '0',
    '--json',
  ])
  expect(api.get).not.toHaveBeenCalled()
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/services/record', {
    _id: 'record',
    businessId: 'business',
    name: 'Free',
    price: 0,
    duration: 0,
  })
})

it('updates explicit appointment fields without an extra business lookup', async () => {
  api.put.mockResolvedValue({ _id: 'record' })
  await run(appointmentsCommand, [
    'update',
    'record',
    '--businessId',
    'business',
    '--startTime',
    'start',
    '--endTime',
    'end',
    '--status',
    'CANCELED',
    '--clientId',
    'client',
    '--note',
    'note',
    '--json',
  ])
  expect(api.get).not.toHaveBeenCalled()
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/appointments/record', {
    _id: 'record',
    businessId: 'business',
    startTime: 'start',
    endTime: 'end',
    status: 'CANCELED',
    clientId: 'client',
    note: 'note',
  })
})

it.each(resources)(
  'does not send a $name write after malformed JSON',
  async ({ create }) => {
    await run(create, ['update', 'record', '--body', '{', '--json'])
    expect(api.get).not.toHaveBeenCalled()
    expect(api.put).not.toHaveBeenCalled()
    expect(fail).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: expect.stringContaining('--body is not valid JSON:'),
      }),
      { json: true },
    )
  },
)

it.each(resources)(
  'reports only successful $name deletions and continues after an error',
  async ({ name, create }) => {
    const error = new Error('synthetic deletion failure')
    api.del
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined)
    await run(create, ['delete', 'one', 'two', 'three', '--json'])
    expect(api.del.mock.calls).toEqual(
      ['one', 'two', 'three'].map(id => [`/api/${name}/${id}`]),
    )
    expect(fail).toHaveBeenCalledExactlyOnceWith(error, { json: true })
    expect(printJson).toHaveBeenCalledExactlyOnceWith({
      ok: false,
      deleted: ['one', 'three'],
    })
  },
)
