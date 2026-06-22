// The shared challenge list is owner-locked: only ADMIN_EMAIL may edit it.
// requireAuth must run first (it sets req.userEmail).

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()

export function isAdmin(email) {
  return !!ADMIN_EMAIL && (email || '').trim().toLowerCase() === ADMIN_EMAIL
}

export function requireAdmin(req, res, next) {
  if (!isAdmin(req.userEmail)) {
    return res.status(403).json({ error: 'Only the owner can edit the challenge' })
  }
  next()
}
