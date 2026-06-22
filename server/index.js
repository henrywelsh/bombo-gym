// Local-dev entry point. Production runs on Vercel via api/index.js (no listen);
// this is the `vite + node` fallback to `vercel dev`. It applies pending migrations
// once on boot for convenience, then serves the API on PORT (Vite proxies /api here).
import app from './app.js'
import { runMigrations } from './migrate.js'

const PORT = process.env.PORT || 3000

await runMigrations()
app.listen(PORT, () => console.log(`Server on :${PORT}`))
