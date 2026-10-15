/* Copyright 2025 Iterola LLC */

// Production Iterola API. Override with ITEROLA_API_URL for staging/dev.
export default function getApiUrl() {
  return process.env.ITEROLA_API_URL || 'https://api.iterola.com'
}
