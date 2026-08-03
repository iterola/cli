/* Copyright 2025 Iterola LLC */
const getApiUrl = require('./getApiUrl.js')
const getApiKeySecret = require('./session/getApiKeySecret.js')

// Iterola API keys are long-lived secrets, so there is no token refresh.
// The API authenticates HTTP Basic auth carrying only the key secret:
// `Authorization: Basic base64(<key secret>)`.
async function request(method, urlPath, body) {
  const url = urlPath.startsWith('https://')
    ? urlPath
    : `${getApiUrl()}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`

  const headers = { 'Content-Type': 'application/json' }
  const secret = getApiKeySecret()
  if (secret) {
    headers.Authorization = `Basic ${Buffer.from(secret).toString('base64')}`
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let message = `${method} ${urlPath} → ${response.status}: ${text}`
    // The API responds 401 when no Authorization header reaches it and 403
    // when the secret is unknown ("Invalid key or secret") — both mean the
    // stored session is absent or wrong.
    if (response.status === 401 || (response.status === 403 && !secret)) {
      message += ' — Not logged in? Run `iterola login` first.'
    }
    throw new Error(message)
  }

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

module.exports = {
  get: urlPath => request('GET', urlPath),
  post: (urlPath, body) => request('POST', urlPath, body),
  put: (urlPath, body) => request('PUT', urlPath, body),
  del: (urlPath, body) => request('DELETE', urlPath, body),
}
