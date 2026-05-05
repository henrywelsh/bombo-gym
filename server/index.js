import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth.js'
import { runMigrations } from './migrate.js'
import lookupRoutes         from './routes/lookup.js'
import profileRoutes        from './routes/profile.js'
import milestoneRoutes      from './routes/milestones.js'
import exerciseLogRoutes    from './routes/exerciseLogs.js'
import bodyMeasRoutes       from './routes/bodyMeasurements.js'
import supplementRoutes     from './routes/supplements.js'
import suppLogRoutes        from './routes/supplementLogs.js'
import mealTemplateRoutes   from './routes/mealTemplates.js'
import mealPlanRoutes       from './routes/mealPlans.js'
import { requireAuth }      from './middleware/requireAuth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000

const app = express()

// better-auth handles its own body parsing — must come before express.json()
app.all('/api/auth/*', toNodeHandler(auth))

app.use(express.json())

app.use('/api', lookupRoutes)

app.use('/api', requireAuth, profileRoutes)
app.use('/api', requireAuth, milestoneRoutes)
app.use('/api', requireAuth, exerciseLogRoutes)
app.use('/api', requireAuth, bodyMeasRoutes)
app.use('/api', requireAuth, supplementRoutes)
app.use('/api', requireAuth, suppLogRoutes)
app.use('/api', requireAuth, mealTemplateRoutes)
app.use('/api', requireAuth, mealPlanRoutes)

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

await runMigrations()
app.listen(PORT, () => console.log(`Server on :${PORT}`))
