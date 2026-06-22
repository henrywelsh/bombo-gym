// Vercel Serverless Function entry — wraps the whole Express app behind /api/*.
// vercel.json rewrites /api/(.*) here, preserving the path so Express still sees
// /api/auth/..., /api/progress, etc. Migrations run via `npm run db:migrate`,
// never at cold-start. The SPA in dist/ is served by Vercel's CDN, not Express.
import app from '../server/app.js'

export default app
