import { Router } from 'express'
import { isAdmin } from '../middleware/requireAdmin.js'

const router = Router()

// Identity for the current session, including whether they own the challenge.
router.get('/me', (req, res) => {
  res.json({ email: req.userEmail, isAdmin: isAdmin(req.userEmail) })
})

export default router
