/* Copyright 2025 Iterola LLC */

import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  session: { synthetic: true },
  api: { get: vi.fn() },
  sessionStore: vi.fn(),
  request: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  signup: vi.fn(),
  schema: vi.fn(),
}))
vi.mock('@monorepool/agentfirst/sessionStore.js', () => ({
  default: mocks.sessionStore,
}))
vi.mock('@monorepool/agentfirst/request.js', () => ({ default: mocks.request }))
vi.mock('@monorepool/agentfirst/loginCommand.js', () => ({
  default: mocks.login,
}))
vi.mock('@monorepool/agentfirst/logoutCommand.js', () => ({
  default: mocks.logout,
}))
vi.mock('@monorepool/agentfirst/signupCommand.js', () => ({
  default: mocks.signup,
}))
vi.mock('@monorepool/agentfirst/schemaCommand.js', () => ({
  default: mocks.schema,
}))

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  mocks.sessionStore.mockReturnValue(mocks.session)
  mocks.request.mockReturnValue(mocks.api)
  vi.stubEnv('ITEROLA_API_URL', '')
})
afterEach(() => vi.unstubAllEnvs())

it('binds the private product session and credential names without accessing storage or transport', async () => {
  const { default: api } = await import('../request.js')
  const { default: getApiUrl } = await import('../getApiUrl.js')
  expect(api).toBe(mocks.api)
  expect(mocks.sessionStore).toHaveBeenCalledExactlyOnceWith({
    productDirName: 'iterola',
  })
  expect(mocks.request).toHaveBeenCalledExactlyOnceWith({
    getApiUrl,
    session: mocks.session,
    envKeyName: 'ITEROLA_API_KEY',
    binaryName: 'iterola',
  })
  expect(mocks.api.get).not.toHaveBeenCalled()
})

it.each(['', 'http://synthetic.example.test'])(
  'resolves the API endpoint for an override of %j',
  async override => {
    vi.stubEnv('ITEROLA_API_URL', override)
    const { default: getApiUrl } = await import('../getApiUrl.js')
    expect(getApiUrl()).toBe(override || 'https://api.iterola.com')
  },
)

it('binds login identity and supplies the business read verification callback', async () => {
  const token = { syntheticCommand: true }
  mocks.login.mockReturnValue(token)
  const { default: login } = await import('../loginCommand.js')
  const { default: getApiUrl } = await import('../getApiUrl.js')
  const { default: packageJson } = await import('../package.json', {
    with: { type: 'json' },
  })
  expect(login()).toBe(token)
  expect(mocks.login).toHaveBeenCalledExactlyOnceWith({
    binaryName: 'iterola',
    appUrl: 'https://app.iterola.com',
    getApiUrl,
    version: packageJson.version,
    session: mocks.session,
    envKeyName: 'ITEROLA_API_KEY',
    verify: expect.any(Function),
  })
  mocks.api.get.mockResolvedValue([{}, {}])
  expect(await mocks.login.mock.calls[0][0].verify()).toBe(
    'Logged in — 2 business(es) accessible with this key.',
  )
  expect(mocks.api.get).toHaveBeenCalledExactlyOnceWith('/api/businesses')
})

it.each([
  {
    status: 403,
    message: 'missing scope businesses:read',
    expected:
      'Key stored. It lacks the businesses:read scope, so it could not be verified — commands within its granted scopes will still work.',
  },
  {
    status: 503,
    message: 'synthetic unavailable',
    expected:
      'Key stored, but the verification call failed: synthetic unavailable',
  },
  {
    status: undefined,
    message: 'synthetic network failure',
    expected:
      'Key stored, but the verification call failed: synthetic network failure',
  },
])(
  'keeps verification failures distinct for $status/$message',
  async ({ status, message, expected }) => {
    const { default: login } = await import('../loginCommand.js')
    login()
    mocks.api.get.mockRejectedValue(
      Object.assign(new Error(message), { status }),
    )
    expect(await mocks.login.mock.calls[0][0].verify()).toBe(expected)
  },
)

it.each([401, 403])(
  'rejects invalid credentials at status %s without treating them as scope gaps',
  async status => {
    const { default: login } = await import('../loginCommand.js')
    login()
    const error = Object.assign(new Error('synthetic unauthorized'), { status })
    mocks.api.get.mockRejectedValue(error)
    await expect(mocks.login.mock.calls[0][0].verify()).rejects.toBe(error)
  },
)

it('binds logout and signup without invoking their shared effects', async () => {
  const { default: logout } = await import('../logoutCommand.js')
  const { default: signup } = await import('../signupCommand.js')
  const { default: getApiUrl } = await import('../getApiUrl.js')
  mocks.logout.mockReturnValue('logout-command')
  mocks.signup.mockReturnValue('signup-command')
  expect(logout()).toBe('logout-command')
  expect(signup()).toBe('signup-command')
  expect(mocks.logout).toHaveBeenCalledExactlyOnceWith({
    binaryName: 'iterola',
    session: mocks.session,
    envKeyName: 'ITEROLA_API_KEY',
  })
  expect(mocks.signup).toHaveBeenCalledExactlyOnceWith({
    binaryName: 'iterola',
    getApiUrl,
    appUrl: 'https://app.iterola.com',
    session: mocks.session,
  })
  expect(mocks.api.get).not.toHaveBeenCalled()
})

it('passes the complete command tree to shared schema discovery unchanged', async () => {
  const { default: schema } = await import('../schemaCommand.js')
  const program = { syntheticProgram: true }
  mocks.schema.mockReturnValue('schema-command')
  expect(schema(program)).toBe('schema-command')
  expect(mocks.schema).toHaveBeenCalledExactlyOnceWith({ program })
})

it('keeps terminal styling explicit rather than altering JSON output', async () => {
  const { default: format } = await import('../formatOutput.js')
  expect(format.dim('text')).toBe('\u001b[2mtext\u001b[0m')
  expect(format.bold('text')).toBe('\u001b[1mtext\u001b[0m')
  expect(format.cyan('text')).toBe('\u001b[36mtext\u001b[0m')
})
