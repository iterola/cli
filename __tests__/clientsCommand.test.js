/* Copyright 2025 Iterola LLC */

import { fail, printJson } from '@monorepool/agentfirst/output.js'
import { beforeEach, expect, it, vi } from 'vitest'

import clientsCommand from '../clientsCommand.js'
import api from '../request.js'

vi.mock('../request.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))
vi.mock('@monorepool/agentfirst/output.js', async importOriginal => ({
  ...(await importOriginal()),
  printJson: vi.fn(),
  fail: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
})

const run = args =>
  clientsCommand().exitOverride().parseAsync(args, { from: 'user' })

it('lists with the documented filters and passes JSON data unchanged', async () => {
  const clients = [{ _id: 'one', name: 'Jane' }]
  api.get.mockResolvedValue(clients)
  await run([
    'list',
    '--businessId',
    'business',
    '--email',
    'a+b@example.com',
    '--userId',
    'user',
    '--limit',
    '8',
    '--skip',
    '0',
    '--fields',
    'name,email',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    '/api/clients?businessId=business&email=a%2Bb%40example.com&userId=user&limit=8&skip=0&fields=name%2Cemail',
  )
  expect(printJson).toHaveBeenCalledExactlyOnceWith(clients)
  expect(fail).not.toHaveBeenCalled()
})

it('uses the default list limit without adding absent filters', async () => {
  api.get.mockResolvedValue([])
  await run(['list', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/clients?limit=25')
  expect(printJson).toHaveBeenCalledExactlyOnceWith([])
})

it.each(['get', 'read'])('reads one client with %s --json', async action => {
  const client = { _id: 'one', name: 'Jane' }
  api.get.mockResolvedValue(client)
  await run([action, 'one', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/clients/one')
  expect(printJson).toHaveBeenCalledExactlyOnceWith(client)
})

it('merges extra create fields while explicit options take precedence', async () => {
  api.post.mockResolvedValue({ _id: 'created' })
  await run([
    'add',
    '--name',
    'Jane',
    '--businessId',
    'business',
    '--email',
    'jane@example.com',
    '--phone',
    '+123',
    '--language',
    'en',
    '--body',
    '{"name":"overridden","note":"keep","businessId":"overridden"}',
    '--json',
  ])
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/clients', {
    name: 'Jane',
    businessId: 'business',
    email: 'jane@example.com',
    phone: '+123',
    language: 'en',
    note: 'keep',
  })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({ ok: true, id: 'created' })
})

it('retains the record business on update and cannot replace the path ID with a body ID', async () => {
  api.get.mockResolvedValue({ businessId: 'existing' })
  api.put.mockResolvedValue({ _id: 'one' })
  await run([
    'update',
    'one',
    '--name',
    'Jane',
    '--body',
    '{"_id":"other","note":"keep"}',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/clients/one')
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/clients/one', {
    _id: 'one',
    businessId: 'existing',
    name: 'Jane',
    note: 'keep',
  })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({ ok: true, id: 'one' })
})

it('does not fetch before an update with an explicit business', async () => {
  api.put.mockResolvedValue({ _id: 'one' })
  await run(['update', 'one', '--businessId', 'chosen', '--json'])
  expect(api.get).not.toHaveBeenCalled()
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/clients/one', {
    _id: 'one',
    businessId: 'chosen',
  })
})

it('rejects malformed extra JSON without sending a write', async () => {
  await run(['add', '--name', 'Jane', '--body', '{', '--json'])
  expect(api.post).not.toHaveBeenCalled()
  expect(fail).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      message: expect.stringContaining('--body is not valid JSON:'),
    }),
    { json: true },
  )
  expect(printJson).not.toHaveBeenCalled()
})

it('reports transport failures through the shared error output', async () => {
  const failure = Object.assign(new Error('not allowed'), { status: 403 })
  api.get.mockRejectedValue(failure)
  await run(['get', 'one', '--json'])
  expect(fail).toHaveBeenCalledExactlyOnceWith(failure, { json: true })
  expect(printJson).not.toHaveBeenCalled()
})

it('deletes each requested ID and reports the actual successes', async () => {
  api.del.mockResolvedValue(undefined)
  await run(['delete', 'one', 'two', '--json'])
  expect(api.del.mock.calls).toEqual([
    ['/api/clients/one'],
    ['/api/clients/two'],
  ])
  expect(printJson).toHaveBeenCalledExactlyOnceWith({
    ok: true,
    deleted: ['one', 'two'],
  })
})
