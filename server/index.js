import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth.js'
import { runMigrations } from './migrate.js'
import meRoutes            from './routes/me.js'
import dailyExerciseRoutes from './routes/dailyExercises.js'
import progressRoutes      from './routes/progress.js'
import boardRoutes         from './routes/board.js'
import { requireAuth }      from './middleware/requireAuth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000

const app = express()

// better-auth handles its own body parsing — must come before express.json()
app.all('/api/auth/*', toNodeHandler(auth))

app.use(express.json())

app.use('/api', requireAuth, meRoutes)
app.use('/api', requireAuth, dailyExerciseRoutes)
app.use('/api', requireAuth, progressRoutes)
app.use('/api', requireAuth, boardRoutes)

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

await runMigrations()
app.listen(PORT, () => console.log(`Server on :${PORT}`))
