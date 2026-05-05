import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function runMigrations() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name   TEXT PRIMARY KEY,
        run_at TIMESTAMPTZ DEFAULT now()
      )
    `)

    const files = ['001_base_schema.sql', '002_seed.sql']
    for (const name of files) {
      const { rowCount } = await client.query(
        `SELECT 1 FROM _migrations WHERE name = $1`, [name]
      )
      if (rowCount > 0) continue

      const sql = await readFile(path.join(__dirname, 'migrations', name), 'utf8')
      await client.query(sql)
      await client.query(`INSERT INTO _migrations (name) VALUES ($1)`, [name])
      console.log(`[migrate] applied ${name}`)
    }
  } finally {
    client.release()
  }
}
