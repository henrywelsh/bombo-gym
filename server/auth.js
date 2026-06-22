import { betterAuth } from 'better-auth'
import { pool } from './db.js'

export const auth = betterAuth({
  database: pool,
  socialProviders: {
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  baseURL: process.env.APP_URL,
  // Origins allowed to call the auth endpoints (CSRF check). Defaults to APP_URL;
  // add a comma-separated BETTER_AUTH_TRUSTED_ORIGINS to permit extra origins
  // (e.g. a custom domain alongside the *.vercel.app URL).
  trustedOrigins: [
    process.env.APP_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',') ?? []),
  ]
    .map((o) => o?.trim())
    .filter(Boolean),
})
