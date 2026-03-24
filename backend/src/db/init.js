import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function run() {
  const schemaPath = path.join(__dirname, 'schema.sql')
  const sql = await fs.readFile(schemaPath, 'utf8')
  await pool.query(sql)
  await pool.end()
  process.stdout.write('Database schema initialized.\n')
}

run().catch(async (error) => {
  process.stderr.write(`Schema init failed: ${error.message}\n`)
  await pool.end().catch(() => {})
  process.exit(1)
})
