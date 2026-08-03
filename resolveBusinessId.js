/* Copyright 2025 Iterola LLC */

// The API requires a businessId on every client/service/appointment write.
// A key locked to one business supplies it implicitly; an organization-wide
// key must send it. On update, when the caller passed no --businessId, reuse
// the businessId of the existing record (costs one extra read).
module.exports = async function resolveBusinessId(options, body, getExisting) {
  let businessId = options.businessId || body.businessId
  if (!businessId) {
    const existing = await getExisting()
    businessId = existing?.businessId
  }
  return businessId
}
